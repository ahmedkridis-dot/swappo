// ============================================================
//  Supabase Edge Function — send-swap-email
//  Swappo transactional emails via Resend.
//
//  Invoked by a Postgres trigger on notifications INSERT
//  (see migration 013_email_trigger.sql). Never called from the
//  browser — the trigger uses the service role which is safe.
//
//  Env vars (set via `supabase secrets set …`):
//    RESEND_API_KEY      — Resend API key (re_…), Sending access only
//    RESEND_FROM         — e.g. "Swappo <noreply@send.swappo.ae>"
//    SUPABASE_URL        — auto-injected by Supabase
//    SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase
//
//  Deploy:
//    supabase functions deploy send-swap-email --no-verify-jwt
//    supabase secrets set RESEND_API_KEY=re_…
//    supabase secrets set RESEND_FROM='Swappo <noreply@send.swappo.ae>'
// ============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Swappo <noreply@send.swappo.ae>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://swappo.ae';

// ── small helpers ─────────────────────────────────────────
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

type Ctx = {
  to: string;
  recipient_name: string;
  actor_name: string;       // "Someone" when anonymity applies
  item_title: string;
  item_photo: string | null;
  amount_aed: number | null;
  url: string;              // deep link into swappo.ae
  kind: string;
};

// ── email templates ───────────────────────────────────────
function template(ctx: Ctx): { subject: string; html: string } {
  const cta =
    ctx.kind === 'swap_accepted'
      ? { label: 'Open chat', url: ctx.url }
      : ctx.kind === 'swap_declined'
      ? { label: 'Browse items', url: `${SITE_URL}/pages/catalogue.html` }
      : { label: 'View offer', url: ctx.url };

  const headline =
    ctx.kind === 'swap_proposed' || ctx.kind === 'offer_received'
      ? `${ctx.actor_name} wants to swap for your ${esc(ctx.item_title)}`
      : ctx.kind === 'swap_accepted'
      ? `${ctx.actor_name} accepted your offer!`
      : ctx.kind === 'swap_declined'
      ? `Your offer was declined`
      : ctx.kind === 'counter_offer'
      ? `${ctx.actor_name} sent you a counter-offer`
      : `Swappo update`;

  const preheader =
    ctx.kind === 'swap_accepted'
      ? 'Identities revealed — open the chat to agree on a meetup.'
      : ctx.kind === 'swap_declined'
      ? 'No worries — plenty more items waiting to be swapped.'
      : ctx.kind === 'counter_offer'
      ? 'Take a look and accept, decline, or counter back.'
      : 'A fresh offer is waiting for you on Swappo.';

  const subject =
    ctx.kind === 'swap_proposed' || ctx.kind === 'offer_received'
      ? `New swap offer on your ${ctx.item_title}`
      : ctx.kind === 'swap_accepted'
      ? `Deal accepted — ${ctx.item_title}`
      : ctx.kind === 'swap_declined'
      ? `Your offer on ${ctx.item_title} was declined`
      : ctx.kind === 'counter_offer'
      ? `Counter-offer on ${ctx.item_title}`
      : `Swappo — ${ctx.item_title}`;

  const photoHTML = ctx.item_photo
    ? `<img src="${esc(ctx.item_photo)}" alt="" width="120" height="120" style="display:block;border-radius:12px;object-fit:cover;width:120px;height:120px;margin:0 auto 16px;" />`
    : '';

  const amountLine =
    ctx.amount_aed && ctx.amount_aed > 0
      ? `<p style="margin:0 0 12px;color:#4A4A5A;font-size:14px;">Cash included: <strong style="color:#1A1A2E;">${ctx.amount_aed.toLocaleString()} AED</strong></p>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,sans-serif;color:#1A1A2E;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(9,177,186,0.08);">
          <tr>
            <td style="padding:28px 28px 8px;text-align:center;">
              <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#09B1BA;">Swappo</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 8px;text-align:center;">
              ${photoHTML}
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#1A1A2E;line-height:1.3;">${esc(headline)}</h1>
              <p style="margin:0 0 20px;color:#4A4A5A;font-size:15px;line-height:1.5;">Hey ${esc(ctx.recipient_name || 'there')},<br/>${esc(preheader)}</p>
              ${amountLine}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 32px;text-align:center;">
              <a href="${esc(cta.url)}" style="display:inline-block;background:linear-gradient(135deg,#09B1BA,#078A91);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:15px;box-shadow:0 4px 16px rgba(9,177,186,0.3);">${esc(cta.label)}</a>
              <p style="margin:20px 0 0;font-size:12px;color:#9CA3AF;line-height:1.5;">Or copy this link:<br/><a href="${esc(cta.url)}" style="color:#09B1BA;text-decoration:underline;word-break:break-all;">${esc(cta.url)}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;background:#F8FAFA;border-top:1px solid #E5E7EB;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#6B7280;">You received this because you have email notifications on.</p>
              <p style="margin:0;font-size:12px;color:#6B7280;"><a href="${SITE_URL}/pages/profile.html#settings" style="color:#09B1BA;text-decoration:underline;">Manage notifications</a> · <a href="${SITE_URL}" style="color:#09B1BA;text-decoration:underline;">swappo.ae</a></p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#9CA3AF;">Swappo · Hannibal General Trading L.L.C — S.P.C · Abu Dhabi, UAE</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

// ── main handler ──────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  if (!RESEND_API_KEY) {
    console.error('[send-swap-email] RESEND_API_KEY not set');
    return json({ error: 'resend_not_configured' }, 503);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const notificationId: string | undefined = body?.notification_id;
  if (!notificationId) return json({ error: 'missing_notification_id' }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Load the notification
  const { data: notif, error: notifErr } = await supabase
    .from('notifications')
    .select('id, user_id, kind, title, message, url, payload')
    .eq('id', notificationId)
    .maybeSingle();

  if (notifErr || !notif) {
    return json({ error: 'notification_not_found', detail: notifErr?.message }, 404);
  }

  // Opt-out check
  const { data: wantEmail } = await supabase.rpc('should_email_user', {
    p_user_id: notif.user_id,
    p_kind: notif.kind,
  });
  if (wantEmail !== true) return json({ skipped: 'user_opted_out', kind: notif.kind }, 200);

  // Recipient + related item/swap for richer templating
  const { data: user } = await supabase
    .from('users')
    .select('id, email, name, pseudo')
    .eq('id', notif.user_id)
    .maybeSingle();

  if (!user?.email) return json({ skipped: 'no_email', kind: notif.kind }, 200);

  const payload = (notif.payload ?? {}) as Record<string, unknown>;
  const itemId = payload.item_id as string | undefined;
  let itemTitle = (payload.item_title as string) ?? 'your item';
  let itemPhoto: string | null = null;
  if (itemId) {
    const { data: it } = await supabase
      .from('items')
      .select('brand, model, type, photos')
      .eq('id', itemId)
      .maybeSingle();
    if (it) {
      itemTitle = (`${it.brand ?? ''} ${it.model ?? ''}`.trim() || it.type || itemTitle) as string;
      itemPhoto = Array.isArray(it.photos) && it.photos.length ? (it.photos[0] as string) : null;
    }
  }

  const actorName =
    notif.kind === 'swap_accepted'
      ? ((payload.actor_name as string) ?? 'The other party')
      : 'Someone'; // anonymity rule: identities hidden until mutual acceptance

  const url =
    typeof notif.url === 'string' && notif.url
      ? notif.url.startsWith('http')
        ? notif.url
        : `${SITE_URL}${notif.url}`
      : `${SITE_URL}/pages/profile.html`;

  const { subject, html } = template({
    to: user.email,
    recipient_name: (user.name || user.pseudo || '') as string,
    actor_name: actorName,
    item_title: itemTitle,
    item_photo: itemPhoto,
    amount_aed: typeof payload.cash_amount === 'number' ? (payload.cash_amount as number) : null,
    url,
    kind: notif.kind,
  });

  // Send via Resend
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [user.email],
      subject,
      html,
      tags: [{ name: 'kind', value: notif.kind }],
    }),
  });

  const resendBody = await resp.text();
  if (!resp.ok) {
    console.error('[send-swap-email] resend error', resp.status, resendBody);
    return json({ error: 'resend_failed', status: resp.status, detail: resendBody }, 502);
  }

  // Best-effort: tag the notification as emailed so we don't double-send
  await supabase
    .from('notifications')
    .update({ emailed_at: new Date().toISOString() })
    .eq('id', notificationId);

  return json({ ok: true, kind: notif.kind, resend: JSON.parse(resendBody) });
});
