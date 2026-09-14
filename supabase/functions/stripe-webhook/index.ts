// ============================================================
//  Supabase Edge Function — stripe-webhook
//  Receives Stripe events and mirrors them into public.users /
//  public.items. This is the ONLY writer of Pro + boost state.
//
//  Deploy WITHOUT JWT (Stripe calls us directly):
//    supabase functions deploy stripe-webhook --no-verify-jwt
//
//  Stripe Dashboard → Developers → Webhooks → Add endpoint
//    URL:    https://<project-ref>.supabase.co/functions/v1/stripe-webhook
//    Events: checkout.session.completed
//            customer.subscription.updated
//            customer.subscription.deleted
//            invoice.paid            (renewals — extends pro_expires_at)
//
//  Env (supabase secrets set …):
//    STRIPE_SECRET_KEY       sk_live_… / sk_test_…
//    STRIPE_WEBHOOK_SECRET   whsec_…  (from the endpoint's "Signing secret")
//    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  auto-injected
//
//  Every handler is idempotent: Stripe retries on non-2xx, and the same
//  event may be delivered more than once.
// ============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';

const STRIPE_SECRET_KEY     = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY           = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const ok = (msg = 'ok') => new Response(msg, { status: 200 });
const bad = (msg: string, status = 400) => new Response(msg, { status });

const isoFromUnix = (s: number | null | undefined) =>
  s ? new Date(s * 1000).toISOString() : null;

// ── Pro helpers ───────────────────────────────────────────
async function grantPro(userId: string, sub: Stripe.Subscription) {
  const interval = sub.items.data[0]?.price?.recurring?.interval === 'year' ? 'year' : 'month';
  const { error } = await admin.from('users').update({
    plan: 'pro',
    is_pro: true,
    plan_interval: interval,
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    pro_expires_at: isoFromUnix(sub.current_period_end),
  }).eq('id', userId);
  if (error) throw error;
}

async function revokePro(userId: string) {
  const { error } = await admin.from('users').update({
    plan: 'free',
    is_pro: false,
    plan_interval: null,
    stripe_subscription_id: null,
    pro_expires_at: null,
  }).eq('id', userId);
  if (error) throw error;
}

async function userIdForSubscription(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.user_id;
  if (fromMeta) return fromMeta;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const { data } = await admin.from('users').select('id').eq('stripe_customer_id', customerId).maybeSingle();
  return (data?.id as string) ?? null;
}

// ── Boost helper ──────────────────────────────────────────
async function applyBoost(session: Stripe.Checkout.Session) {
  const m = session.metadata ?? {};
  const userId = m.user_id, itemId = m.item_id, tier = m.tier;
  const days = parseInt(m.duration_days ?? '0', 10);
  const amountAed = parseInt(m.amount_aed ?? '0', 10);
  if (!userId || !itemId || !tier || !days) return;

  // Ledger insert doubles as the idempotency key (UNIQUE stripe_session_id).
  const { error: ledgerErr } = await admin.from('boost_purchases').insert({
    user_id: userId,
    item_id: itemId,
    tier,
    duration_days: days,
    amount_aed: amountAed,
    stripe_session_id: session.id,
  });
  if (ledgerErr) {
    if (ledgerErr.code === '23505') return; // already applied on a previous delivery
    throw ledgerErr;
  }

  // Extend from the current expiry if a boost is still running, else from now.
  const { data: item } = await admin
    .from('items')
    .select('boost_expires_at')
    .eq('id', itemId)
    .eq('user_id', userId)
    .maybeSingle();

  const now = Date.now();
  const current = item?.boost_expires_at ? new Date(item.boost_expires_at as string).getTime() : 0;
  const base = current > now ? current : now;
  const expires = new Date(base + days * 86_400_000).toISOString();

  const { error } = await admin.from('items').update({
    is_boosted: true,
    boost_expires_at: expires,
  }).eq('id', itemId).eq('user_id', userId);
  if (error) throw error;
}

// ── Event router ──────────────────────────────────────────
serve(async (req) => {
  if (req.method !== 'POST') return bad('Method not allowed', 405);
  if (!STRIPE_WEBHOOK_SECRET) return bad('Webhook secret not configured', 500);

  const sig = req.headers.get('stripe-signature');
  if (!sig) return bad('Missing stripe-signature');

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, STRIPE_WEBHOOK_SECRET, undefined, cryptoProvider);
  } catch (e: any) {
    console.error('[stripe-webhook] bad signature:', e?.message);
    return bad('Invalid signature');
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const kind = session.metadata?.kind;
        if (kind === 'boost') {
          if (session.payment_status === 'paid') await applyBoost(session);
        } else if (kind === 'pro' && session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          const userId = session.metadata?.user_id ?? await userIdForSubscription(sub);
          if (userId) await grantPro(userId, sub);
        }
        break;
      }

      case 'invoice.paid': {
        // Renewal — refresh the period end so the nightly cron never downgrades a paying user.
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (!subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = await userIdForSubscription(sub);
        if (userId) await grantPro(userId, sub);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await userIdForSubscription(sub);
        if (!userId) break;
        // active / trialing / past_due keep Pro until the paid period ends;
        // canceled-at-period-end also keeps Pro until current_period_end.
        if (['active', 'trialing', 'past_due'].includes(sub.status)) {
          await grantPro(userId, sub);
        } else if (['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status)) {
          await revokePro(userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await userIdForSubscription(sub);
        if (userId) await revokePro(userId);
        break;
      }

      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break;
    }
    return ok();
  } catch (e: any) {
    console.error('[stripe-webhook]', event.type, e?.message ?? e);
    return bad('Handler error', 500); // non-2xx → Stripe retries
  }
});
