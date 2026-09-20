import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify Authorization Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is active admin in admin_users
    const { data: adminRow } = await supabaseAdmin
      .from('admin_users')
      .select('is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (!adminRow?.is_active) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Active admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, email, isAnchor, password } = await req.json();

    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: 'Judge full name and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const tempPassword = password || `Spotlight2026!${Math.floor(1000 + Math.random() * 9000)}`;

    // Create Supabase Auth User securely via Admin API
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: cleanName, role: 'judge' },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique judge_code
    const { data: existingJudges } = await supabaseAdmin
      .from('judges')
      .select('judge_code');

    let maxNum = 0;
    if (existingJudges) {
      for (const j of existingJudges) {
        if (j.judge_code && j.judge_code.startsWith('JUDGE-')) {
          const num = parseInt(j.judge_code.replace('JUDGE-', ''), 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    }
    const nextCode = `JUDGE-${String(maxNum + 1).padStart(2, '0')}`;

    // Insert judge record linked to auth_user_id
    const { data: judgeRow, error: judgeError } = await supabaseAdmin
      .from('judges')
      .insert({
        name: cleanName,
        email: cleanEmail,
        judge_code: nextCode,
        is_anchor: !!isAnchor,
        is_active: true,
        auth_user_id: authData.user.id,
      })
      .select()
      .single();

    if (judgeError) {
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: judgeError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        judge: judgeRow,
        tempPassword,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
