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

/**
 * Base64URL encoder helper for RFC 2822 MIME raw strings
 */
function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Builds HTML Email Template for Spotlight Audience Ticket Pass
 */
function buildTicketEmailHtml(buyerName: string, ticketCode: string, recipientEmail: string): string {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticketCode)}&color=FACC15&bgcolor=08080C`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Spotlight Ticket Pass</title>
</head>
<body style="margin: 0; padding: 0; background-color: #08080C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #08080C; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- MAIN CONTAINER -->
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0E0E16; border: 2px solid #FACC15; box-shadow: 0 0 40px rgba(250, 204, 21, 0.15);">
          
          <!-- TOP GOLD BANNER -->
          <tr>
            <td style="background-color: #FACC15; padding: 12px 24px; text-align: center;">
              <span style="color: #08080C; font-size: 13px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
                ★ OFFICIAL SPOTLIGHT AUDIENCE PASS 2026 ★
              </span>
            </td>
          </tr>

          <!-- TICKET CONTENT -->
          <tr>
            <td style="padding: 32px 24px; text-align: center;">
              
              <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px; text-transform: uppercase;">
                YOU'RE IN, ${buyerName.toUpperCase()}!
              </h1>
              
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #A1A1AA; line-height: 1.5;">
                Your audience ticket pass for Spotlight Live 2026 is confirmed. Show this QR code at the venue entrance.
              </p>

              <!-- TICKET CARD BOX -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #141420; border: 1px solid #27273C; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <span style="display: block; font-size: 11px; color: #71717A; font-family: monospace; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px;">
                      TICKET PASS CODE
                    </span>
                    <span style="display: block; font-size: 24px; font-weight: 800; color: #FACC15; font-family: monospace; letter-spacing: 2px; margin-bottom: 16px;">
                      ${ticketCode}
                    </span>

                    <!-- QR CODE DISPLAY -->
                    <div style="display: inline-block; padding: 12px; background-color: #08080C; border: 1px solid #FACC15; margin-bottom: 12px;">
                      <img src="${qrUrl}" alt="Ticket QR Code" width="180" height="180" style="display: block; border: 0;" />
                    </div>

                    <span style="display: block; font-size: 11px; color: #FACC15; font-family: monospace; text-transform: uppercase; letter-spacing: 1px;">
                      SCAN AT AUDITORIUM ENTRANCE
                    </span>
                  </td>
                </tr>
              </table>

              <!-- DETAILS GRID -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; text-align: left;">
                <tr>
                  <td width="50%" style="padding: 10px; background-color: #141420; border: 1px solid #27273C;">
                    <span style="display: block; font-size: 10px; color: #71717A; font-family: monospace; uppercase;">EVENT</span>
                    <span style="display: block; font-size: 13px; font-weight: 700; color: #FFFFFF;">Spotlight Live 2026</span>
                  </td>
                  <td width="50%" style="padding: 10px; background-color: #141420; border: 1px solid #27273C;">
                    <span style="display: block; font-size: 10px; color: #71717A; font-family: monospace; uppercase;">PRICE</span>
                    <span style="display: block; font-size: 13px; font-weight: 700; color: #FACC15;">₹10 (PAID)</span>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; color: #71717A; font-family: monospace; line-height: 1.6;">
                Linked to <strong>${recipientEmail}</strong>.<br />
                You can also view this ticket anytime at <a href="https://talentdaymvj.vercel.app/account" style="color: #FACC15; text-decoration: underline;">talentdaymvj.vercel.app/account</a>.
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #08080C; padding: 16px 24px; text-align: center; border-top: 1px solid #1E1E2C;">
              <span style="color: #52525B; font-size: 11px; font-family: monospace;">
                Spotlight Live 2026 • Official Event Ticketing Platform
              </span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Bootstrap Supabase Admin Client ──────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Server configuration error: missing Supabase URL or Service Role Key' }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 2. Parse Request Body ───────────────────────────────────────────────
    let body: { ticket_code?: string; is_resend?: boolean };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const ticketCode = (body.ticket_code ?? '').trim().toUpperCase();
    const isResend = body.is_resend === true;

    if (!ticketCode) {
      return jsonResponse({ error: 'ticket_code is required' }, 400);
    }

    // ── 3. Retrieve Ticket Pass from Database ───────────────────────────────
    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from('tickets')
      .select('id, ticket_code, user_id, buyer_name, buyer_email, payment_status, created_at')
      .eq('ticket_code', ticketCode)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return jsonResponse({ error: 'Ticket pass not found in database' }, 404);
    }

    if (ticket.payment_status !== 'PAID') {
      return jsonResponse({ error: 'Ticket payment status is not confirmed' }, 400);
    }

    // ── 4. Verify Authorization (Caller JWT match or Service Role) ──────────
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);

      if (caller && ticket.user_id && caller.id !== ticket.user_id) {
        // Verify if caller is an active admin
        const { data: adminRow } = await supabaseAdmin
          .from('admin_users')
          .select('is_active')
          .eq('id', caller.id)
          .maybeSingle();

        if (!adminRow?.is_active) {
          return jsonResponse({ error: 'Forbidden: You do not own this ticket pass' }, 403);
        }
      }
    }

    // ── 5. Idempotency Check in ticket_email_deliveries Table ───────────────
    const { data: existingDelivery } = await supabaseAdmin
      .from('ticket_email_deliveries')
      .select('id, status, recipient_email, sent_at, retry_count')
      .eq('ticket_code', ticketCode)
      .maybeSingle();

    if (existingDelivery && existingDelivery.status === 'SENT' && !isResend) {
      return jsonResponse({
        success: true,
        alreadySent: true,
        message: 'Ticket email pass has already been delivered for this ticket.',
        delivery: existingDelivery,
      });
    }

    // Insert or update delivery record to PENDING
    let deliveryId = existingDelivery?.id;
    if (!existingDelivery) {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('ticket_email_deliveries')
        .insert({
          ticket_id: ticket.id,
          ticket_code: ticket.ticket_code,
          recipient_email: ticket.buyer_email,
          status: 'PENDING',
          retry_count: 0,
        })
        .select('id')
        .single();

      if (insertErr || !inserted) {
        console.error('[send_ticket_email] Failed to insert delivery row:', insertErr);
      } else {
        deliveryId = inserted.id;
      }
    } else {
      await supabaseAdmin
        .from('ticket_email_deliveries')
        .update({
          status: 'PENDING',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDelivery.id);
    }

    // ── 6. Obtain Google OAuth2 Access Token / Transmit Email ──────────────
    const clientId = Deno.env.get('GMAIL_CLIENT_ID');
    const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');
    const refreshToken = Deno.env.get('GMAIL_REFRESH_TOKEN');
    const senderEmail = Deno.env.get('GMAIL_SENDER_EMAIL') || 'spotlight.talentday@gmail.com';

    let emailSent = false;
    let errorMessage: string | null = null;

    if (clientId && clientSecret && refreshToken) {
      try {
        // Exchange Refresh Token for Access Token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) {
          throw new Error(tokenData.error_description || tokenData.error || 'Failed to obtain Google access token');
        }

        const accessToken = tokenData.access_token;

        // Build RFC 2822 Raw Email String
        const subject = `Your Spotlight Live 2026 Ticket Pass [${ticket.ticket_code}]`;
        const htmlBody = buildTicketEmailHtml(ticket.buyer_name, ticket.ticket_code, ticket.buyer_email);

        const rawMime = [
          `From: Spotlight Live 2026 <${senderEmail}>`,
          `To: ${ticket.buyer_name} <${ticket.buyer_email}>`,
          `Subject: ${subject}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=utf-8`,
          ``,
          htmlBody,
        ].join('\r\n');

        const base64Raw = base64UrlEncode(rawMime);

        // Send via Gmail REST API
        const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: base64Raw }),
        });

        const gmailData = await gmailRes.json();
        if (!gmailRes.ok) {
          throw new Error(gmailData.error?.message || 'Gmail API request failed');
        }

        emailSent = true;
      } catch (err: any) {
        errorMessage = err.message || 'Gmail API email transmission failed';
        console.error('[send_ticket_email] Email transmission error:', err);
      }
    } else {
      // Development mode fallback when Gmail secrets are not configured in environment
      console.warn('[send_ticket_email] Gmail secrets not configured in Edge secrets. Mocking email delivery.');
      emailSent = true; // Mark as sent for dev testing when secrets are absent
    }

    // ── 7. Update Delivery Status Record ─────────────────────────────────────
    const now = new Date().toISOString();
    const currentRetries = (existingDelivery?.retry_count ?? 0) + 1;

    if (deliveryId) {
      await supabaseAdmin
        .from('ticket_email_deliveries')
        .update({
          status: emailSent ? 'SENT' : 'FAILED',
          sent_at: emailSent ? now : null,
          error_message: errorMessage,
          retry_count: currentRetries,
          updated_at: now,
        })
        .eq('id', deliveryId);
    }

    if (!emailSent) {
      return jsonResponse({
        success: false,
        error: errorMessage || 'Failed to transmit email pass',
      }, 500);
    }

    return jsonResponse({
      success: true,
      delivered: true,
      alreadySent: false,
      recipient: ticket.buyer_email,
      ticketCode: ticket.ticket_code,
      message: `Ticket pass successfully emailed to ${ticket.buyer_email}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return jsonResponse({ error: message }, 500);
  }
});
