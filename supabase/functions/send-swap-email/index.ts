// ============================================================
//  Supabase Edge Function — send-swap-email
//  Swappo transactional emails via Resend.
//
//  Invoked by a Postgres trigger on notifications INSERT
//  (see migrations 013 → 047: every kind is emailed, once). Never called from the
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
  preview: string | null;   // short quote of the chat message (new_message kind)
  url: string;              // deep link into swappo.ae
  kind: string;
  box_count: number | null; // size of the Swap Box if the proposer offered a box
  title: string;            // notification title / message: used by the generic template
  message: string;
};

// ── email templates ───────────────────────────────────────
// One spec per kind; the layout below is shared and never changes.
// Any kind without a spec (present or future) falls back to the GENERIC
// one — subject = notification title, body = notification message — so no
// notification can stay silent (migration 047).
// Vocabulary rule: a gift is never a game. Words allowed: received, given,
// claim accepted, the giver chose you.
type Spec = { subject: string; headline: string; body: string; cta: { label: string; url: string } };

function specFor(ctx: Ctx): Spec {
  const mySwaps = `${SITE_URL}/pages/profile.html?tab=swap-dashboard`;
  const boxSuffix = ctx.box_count && ctx.box_count >= 2
    ? ` (Swap Box of ${ctx.box_count} items)` : '';
  switch (ctx.kind) {
    case 'banned':
      return {
        subject: 'Your Swappo account has been closed',
        headline: 'Your Swappo account has been closed',
        body: 'One fake listing closes the account. Details inside.',
        cta: { label: 'Contact us', url: 'mailto:contact@swappo.ae' },
      };
    case 'swap_proposed':
    case 'offer_received':
      return {
        subject: `New swap offer on your ${ctx.item_title}`,
        headline: `${ctx.actor_name} wants to swap for your ${ctx.item_title}${boxSuffix}`,
        body: 'A fresh offer is waiting for you on Swappo.',
        cta: { label: 'View offer', url: ctx.url },
      };
    case 'gift_claimed':
      return {
        subject: `Someone claimed your gift: ${ctx.item_title}`,
        headline: `A member is asking for your ${ctx.item_title}`,
        body: "Open My Swaps to see who's asking and accept or decline. You choose who receives your gift.",
        cta: { label: 'See the claim', url: ctx.url },
      };
    case 'swap_accepted':
      return {
        subject: `Deal accepted — ${ctx.item_title}`,
        headline: `${ctx.actor_name} accepted your offer!`,
        body: 'Identities revealed — open the chat to agree on a meetup.',
        cta: { label: 'Open chat', url: ctx.url },
      };
    case 'swap_declined':
      return {
        subject: `Your offer on ${ctx.item_title} was declined`,
        headline: 'Your offer was declined',
        body: 'No worries — plenty more items waiting to be swapped.',
        cta: { label: 'Browse items', url: `${SITE_URL}/pages/catalogue.html` },
      };
    case 'counter_offer':
      return {
        subject: `Counter-offer on ${ctx.item_title}`,
        headline: `${ctx.actor_name} sent you a counter-offer`,
        body: 'Take a look and accept, decline, or counter back.',
        cta: { label: 'View offer', url: ctx.url },
      };
    case 'new_message':
      return {
        subject: `New message about ${ctx.item_title}`,
        headline: `${ctx.actor_name} sent you a message`,
        body: 'The chat went quiet for a while — here is what you missed.',
        cta: { label: 'Open chat', url: ctx.url },
      };
    case 'swap_cancelled':
      return {
        subject: 'An offer was withdrawn',
        headline: ctx.title || 'Deal cancelled',
        body: ctx.message || 'The other member cancelled the deal. The items are available again.',
        cta: { label: 'Open My Swaps', url: mySwaps },
      };
    case 'boost':
    case 'boost_expiring':
      return {
        subject: 'Your boost ends soon',
        headline: ctx.title || 'Your boost ends soon',
        body: ctx.message || 'Boost again to keep your listing at the top of the Swap Market.',
        cta: { label: 'Boost again', url: `${SITE_URL}/pages/profile.html` },
      };
    case 'pro':
    case 'pro_expiring':
      return {
        subject: ctx.title || 'Your Swappo Pro is active',
        headline: ctx.title || 'Your Swappo Pro is active',
        body: ctx.message || 'Your Pro benefits are live: included boosts, more gift claims, no ads.',
        cta: { label: 'My Swaps', url: mySwaps },
      };
    default:
      return {
        subject: ctx.title || 'Swappo update',
        headline: ctx.title || 'Swappo update',
        body: ctx.message || 'Something new is waiting for you on Swappo.',
        cta: { label: 'Open Swappo', url: ctx.url },
      };
  }
}

function template(ctx: Ctx): { subject: string; html: string } {
  const spec = specFor(ctx);
  const cta = spec.cta;
  const headline = spec.headline;
  const preheader = spec.body;
  const subject = spec.subject;

  const photoHTML = ctx.item_photo
    ? `<img src="${esc(ctx.item_photo)}" alt="" width="120" height="120" style="display:block;border-radius:12px;object-fit:cover;width:120px;height:120px;margin:0 auto 16px;" />`
    : '';

  const amountLine =
    ctx.amount_aed && ctx.amount_aed > 0
      ? `<p style="margin:0 0 12px;color:#4A4A5A;font-size:14px;">Cash included: <strong style="color:#1A1A2E;">${ctx.amount_aed.toLocaleString()} AED</strong></p>`
      : '';

  // For "new_message" emails we quote a short preview of what the other
  // party wrote so the recipient knows whether it's worth re-opening.
  const bannedLine =
    ctx.kind === 'banned' && ctx.preview
      ? `<p style="margin:0 0 16px;color:#1A1A2E;font-size:15px;line-height:1.6;">${esc(ctx.preview)}</p>`
      : '';
  const previewLine =
    ctx.kind === 'new_message' && ctx.preview
      ? `<blockquote style="margin:12px 16px 20px;padding:12px 16px;border-left:3px solid #09B1BA;background:#F8FAFA;border-radius:6px;color:#1A1A2E;font-size:14px;line-height:1.5;text-align:left;font-style:normal;">${esc(ctx.preview)}</blockquote>`
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
              ${bannedLine}${previewLine}
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
    .select('id, user_id, kind, title, message, url, payload, emailed_at')
    .eq('id', notificationId)
    .maybeSingle();

  if (notifErr || !notif) {
    return json({ error: 'notification_not_found', detail: notifErr?.message }, 404);
  }

  // Never email the same notification twice (migration 047).
  if (notif.emailed_at) return json({ skipped: 'already_emailed', kind: notif.kind }, 200);

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

  // Anonymity rule: identities are hidden until mutual acceptance. After
  // that, swap_accepted and any chat-triggered emails (new_message) can
  // safely reveal the other party's name.
  const actorName =
    notif.kind === 'swap_accepted' || notif.kind === 'new_message'
      ? ((payload.actor_name as string) ?? 'The other party')
      : 'Someone';

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
    preview: notif.kind === 'banned'
      ? (notif.message as string)
      : (typeof payload.preview === 'string' ? (payload.preview as string) : null),
    url,
    kind: notif.kind,
    box_count: typeof payload.proposer_box_count === 'number' ? (payload.proposer_box_count as number) : null,
    title: (notif.title ?? '') as string,
    message: (notif.message ?? '') as string,
  });

  // Claim the row before sending: two concurrent calls (trigger + a manual
  // catch-up) can never both send. Released if the provider refuses.
  const { data: claimed, error: claimErr } = await supabase.rpc('claim_notification_email', {
    p_notification_id: notificationId,
  });
  if (claimErr) console.error('[send-swap-email] claim failed', claimErr.message);
  if (!claimErr && claimed !== true) return json({ skipped: 'already_emailed', kind: notif.kind }, 200);

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
    await supabase.rpc('release_notification_email', { p_notification_id: notificationId });
    return json({ error: 'resend_failed', status: resp.status, detail: resendBody }, 502);
  }

  // Already stamped by claim_notification_email(); keep the direct write as
  // a fallback in case the claim RPC was unavailable.
  if (claimErr) {
    await supabase
      .from('notifications')
      .update({ emailed_at: new Date().toISOString() })
      .eq('id', notificationId);
  }

  return json({ ok: true, kind: notif.kind, resend: JSON.parse(resendBody) });
});
