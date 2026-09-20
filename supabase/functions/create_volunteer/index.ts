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

    const token = authHeader.slice(7);
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
    let body: { name?: string; email?: string; phone?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const cleanName = (body.name ?? '').trim();
    const cleanEmail = (body.email ?? '').trim().toLowerCase();
    const cleanPhone = (body.phone ?? '').trim();

    if (!cleanName) {
      return jsonResponse({ error: 'Volunteer full name is required' }, 400);
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return jsonResponse({ error: 'A valid Google email address is required' }, 400);
    }

    // ── 5. Duplicate-email check (idempotency guard) ─────────────────────────
    const { data: existingVolunteer } = await supabaseAdmin
      .from('volunteers')
      .select('id, volunteer_code, name, email, is_active, auth_user_id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingVolunteer) {
      const isLinked = existingVolunteer.auth_user_id !== null;
      return jsonResponse({
        success: true,
        alreadyExists: true,
        volunteer: {
          id: existingVolunteer.id,
          name: existingVolunteer.name,
          email: existingVolunteer.email,
          code: existingVolunteer.volunteer_code,
          isActive: existingVolunteer.is_active,
          authLinked: isLinked,
        },
        message: isLinked
          ? `${existingVolunteer.name} is already registered and their Google account is linked. No action taken.`
          : `${existingVolunteer.name} is already registered and awaiting their Google sign-in to activate scanner access.`,
      });
    }

    // ── 6. Generate unique volunteer_code & insert volunteer row ────────────
    //
    // IMPORTANT: No Supabase Auth account is created here.
    // No password is generated or stored.
    //
    // The volunteer must sign in to Spotlight using the existing Google OAuth
    // flow with the registered email address. On their first authenticated
    // session, the SECURITY DEFINER function link_volunteer_google_identity()
    // will automatically match their auth.uid() to this record by email and
    // set auth_user_id, activating their scanner access.
    //
    let volunteerRow = null;
    let lastInsertError: string | null = null;
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { data: existingCodes } = await supabaseAdmin
        .from('volunteers')
        .select('volunteer_code');

      let maxNum = 0;
      if (existingCodes) {
        for (const row of existingCodes) {
          if (row.volunteer_code?.startsWith('VOL-')) {
            const n = parseInt(row.volunteer_code.replace('VOL-', ''), 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
      }
      const volunteerCode = `VOL-${String(maxNum + 1 + attempt).padStart(2, '0')}`;

      const { data: inserted, error: volError } = await supabaseAdmin
        .from('volunteers')
        .insert({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone || null,
          volunteer_code: volunteerCode,
          is_active: true,
          auth_user_id: null, // Pending — set automatically on first Google sign-in
        })
        .select('id, name, email, phone, volunteer_code, is_active, auth_user_id, created_at')
        .maybeSingle();

      if (!volError && inserted) {
        volunteerRow = inserted;
        break;
      }

      lastInsertError = volError?.message ?? 'Failed to insert volunteer row';

      // Only retry on volunteer_code uniqueness conflicts
      if (!lastInsertError.includes('volunteer_code')) {
        break;
      }
    }

    if (!volunteerRow) {
      return jsonResponse({
        error: lastInsertError ?? 'Failed to create volunteer record after retries',
      }, 400);
    }

    return jsonResponse({
      success: true,
      alreadyExists: false,
      volunteer: {
        id: volunteerRow.id,
        name: volunteerRow.name,
        email: volunteerRow.email,
        phone: volunteerRow.phone,
        code: volunteerRow.volunteer_code,
        isActive: volunteerRow.is_active,
        authLinked: false, // Pending Google sign-in — not yet active for scanning
        createdAt: volunteerRow.created_at,
      },
      // No password. No temporary credentials. Google OAuth only.
      message: `Volunteer record created for ${volunteerRow.name}. They must sign in to Spotlight using Google with ${volunteerRow.email} to activate their scanner access.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return jsonResponse({ error: message }, 500);
  }
});
