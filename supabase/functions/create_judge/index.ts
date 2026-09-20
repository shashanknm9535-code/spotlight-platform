import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Bootstrap admin client (service-role, server-side only) ──────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Server misconfiguration: missing Supabase credentials' }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 2. Verify caller's JWT ───────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.slice(7); // strip "Bearer "
    const {
      data: { user: callerUser },
      error: jwtError,
    } = await supabaseAdmin.auth.getUser(token);

    if (jwtError || !callerUser) {
      return jsonResponse({ error: 'Unauthorized: invalid or expired token' }, 401);
    }

    // ── 3. Verify caller is an active admin ──────────────────────────────────
    const { data: adminRow, error: adminErr } = await supabaseAdmin
      .from('admin_users')
      .select('is_active')
      .eq('id', callerUser.id)
      .maybeSingle();

    if (adminErr || !adminRow?.is_active) {
      return jsonResponse({ error: 'Forbidden: active admin access required' }, 403);
    }

    // ── 4. Parse and validate request body ──────────────────────────────────
    let body: { name?: string; email?: string; isAnchor?: boolean };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const cleanName = (body.name ?? '').trim();
    const cleanEmail = (body.email ?? '').trim().toLowerCase();
    const isAnchor = body.isAnchor === true;

    if (!cleanName) {
      return jsonResponse({ error: 'Judge full name is required' }, 400);
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return jsonResponse({ error: 'A valid email address is required' }, 400);
    }

    // ── 5. Duplicate-email check (idempotency guard) ─────────────────────────
    // Check if a judge row with this email already exists.
    const { data: existingJudge } = await supabaseAdmin
      .from('judges')
      .select('id, judge_code, name, email, is_active, auth_user_id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingJudge) {
      // Return the existing record without creating anything new.
      return jsonResponse({
        success: true,
        alreadyExists: true,
        judge: {
          id: existingJudge.id,
          name: existingJudge.name,
          email: existingJudge.email,
          code: existingJudge.judge_code,
          isAnchor,
          isActive: existingJudge.is_active,
          authLinked: existingJudge.auth_user_id !== null,
        },
        message: 'A judge with this email already exists. No new account was created.',
      });
    }

    // ── 6. Check if an Auth user with this email already exists ─────────────
    // Use paginated listUsers search to find the user reliably regardless of count.
    let existingAuthUser = null;
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: authList, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (listError || !authList?.users || authList.users.length === 0) {
        break;
      }
      const found = authList.users.find((u) => u.email?.toLowerCase() === cleanEmail);
      if (found) {
        existingAuthUser = found;
        break;
      }
      if (authList.users.length < perPage) {
        break;
      }
      page++;
    }

    let authUserId: string;
    let tempPassword: string | null = null;
    let authCreated = false;

    if (existingAuthUser) {
      // Auth user already exists — link to a new judge row without re-creating
      authUserId = existingAuthUser.id;
    } else {
      // ── 7. Create Supabase Auth user ─────────────────────────────────────
      const randomArray = new Uint32Array(1);
      crypto.getRandomValues(randomArray);
      const randomPin = 1000 + (randomArray[0] % 9000);
      tempPassword = `Spotlight${randomPin}!`;

      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true, // pre-confirm so judge can log in immediately
        user_metadata: { name: cleanName, role: 'judge' },
      });

      if (createError || !authData?.user) {
        return jsonResponse({
          error: createError?.message ?? 'Failed to create Auth user',
        }, 400);
      }

      authUserId = authData.user.id;
      authCreated = true;
    }

    // ── 8. Generate unique judge_code & insert judge row (with retry loop for race conditions) ──
    let judgeRow = null;
    let lastInsertError: string | null = null;
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { data: existingCodes } = await supabaseAdmin
        .from('judges')
        .select('judge_code');

      let maxNum = 0;
      if (existingCodes) {
        for (const row of existingCodes) {
          if (row.judge_code?.startsWith('JUDGE-')) {
            const n = parseInt(row.judge_code.replace('JUDGE-', ''), 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
      }
      const judgeCode = `JUDGE-${String(maxNum + 1 + attempt).padStart(2, '0')}`;

      // ── 9. Insert judge row, linked to auth_user_id ──────────────────────────
      const { data: inserted, error: judgeError } = await supabaseAdmin
        .from('judges')
        .insert({
          name: cleanName,
          email: cleanEmail,
          judge_code: judgeCode,
          is_anchor: isAnchor,
          is_active: true,
          auth_user_id: authUserId,
        })
        .select('id, name, email, judge_code, is_anchor, is_active, auth_user_id, created_at')
        .maybeSingle();

      if (!judgeError && inserted) {
        judgeRow = inserted;
        break;
      }

      lastInsertError = judgeError?.message ?? 'Failed to insert judge row';

      // If error is unique constraint on auth_user_id, don't retry code, stop immediately
      if (lastInsertError.includes('judges_auth_user_id_unique') || lastInsertError.includes('auth_user_id')) {
        break;
      }
    }

    if (!judgeRow) {
      // ── 10. Atomic rollback: delete Auth user if we just created it ─────
      if (authCreated) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      return jsonResponse({
        error: lastInsertError ?? 'Failed to create judge record after retries',
      }, 400);
    }

    // ── 11. Return safe judge information (never expose service-role key) ────
    return jsonResponse({
      success: true,
      alreadyExists: false,
      judge: {
        id: judgeRow.id,
        name: judgeRow.name,
        email: judgeRow.email,
        code: judgeRow.judge_code,
        isAnchor: judgeRow.is_anchor,
        isActive: judgeRow.is_active,
        authLinked: true,
        createdAt: judgeRow.created_at,
      },
      // tempPassword is provided ONLY on first creation.
      // Admin must copy it immediately — it is not stored or retrievable later.
      tempPassword: authCreated ? tempPassword : null,
      authCreated,
      message: authCreated
        ? 'Judge account and login credentials created successfully.'
        : 'Judge row created and linked to existing Auth account.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return jsonResponse({ error: message }, 500);
  }
});
