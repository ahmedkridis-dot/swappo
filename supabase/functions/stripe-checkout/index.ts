// ============================================================
//  Supabase Edge Function — stripe-checkout
//  Creates Stripe Checkout / Billing-Portal sessions for Swappo
//  revenue only: Pro subscription + item boosts.
//
//  Swappo NEVER moves money between users (CLAUDE.md rule #3).
//
//  Called from the browser via db.functions.invoke('stripe-checkout')
//  → Supabase verifies the user JWT before we run (deploy WITHOUT
//    --no-verify-jwt).
//
//  Body:
//    { kind: 'pro',    interval: 'month' | 'year' }
//    { kind: 'boost',  item_id: uuid, tier: '24h' | '3d' | '7d' }
//    { kind: 'portal' }                       → Billing Portal URL
//  Optional: success_url / cancel_url (must start with SITE_URL).
//
//  Response: { url } — the browser redirects there.
//
//  Env (supabase secrets set …):
//    STRIPE_SECRET_KEY          sk_live_… / sk_test_…
//    SITE_URL                   https://swappo.ae (default)
//    SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY  auto
//
//  Deploy:
//    supabase functions deploy stripe-checkout
// ============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const SITE_URL          = (Deno.env.get('SITE_URL') ?? 'https://swappo.ae').replace(/\/+$/, '');
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY          = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Single source of truth for prices, in fils (AED × 100).
// Mirrors js/constants.js (PLANS / BOOST_PRICES) — keep them in sync.
const PRO_PRICES: Record<'month' | 'year', number> = { month: 2900, year: 24900 };
const BOOST_TIERS: Record<'24h' | '3d' | '7d', { amount: number; days: number; label: string }> = {
  '24h': { amount: 500,  days: 1, label: '24h boost' },
  '3d':  { amount: 1000, days: 3, label: '3-day boost' },
  '7d':  { amount: 2500, days: 7, label: '7-day boost + featured' },
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// Only allow return URLs on our own site (open-redirect guard).
function safeUrl(candidate: unknown, fallback: string): string {
  const s = typeof candidate === 'string' ? candidate : '';
  return s.startsWith(SITE_URL + '/') ? s : fallback;
}

async function getOrCreateCustomer(
  admin: ReturnType<typeof createClient>,
  userId: string,
  email: string | null,
): Promise<string> {
  const { data: row } = await admin
    .from('users')
    .select('stripe_customer_id, name, pseudo')
    .eq('id', userId)
    .maybeSingle();

  if (row?.stripe_customer_id) return row.stripe_customer_id as string;

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: (row?.name as string) || (row?.pseudo as string) || undefined,
    metadata: { swappo_user_id: userId },
  });

  await admin.from('users').update({ stripe_customer_id: customer.id }).eq('id', userId);
  return customer.id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405);
  if (!STRIPE_SECRET_KEY)       return json({ error: 'Stripe not configured' }, 500);

  // ── Who is calling? (JWT already verified by the platform) ──
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: 'Not signed in' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body */ }

  const kind = String(body.kind ?? '');

  try {
    const customerId = await getOrCreateCustomer(admin, user.id, user.email ?? null);

    // ── Billing portal (manage / cancel subscription) ──
    if (kind === 'portal') {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: safeUrl(body.return_url, `${SITE_URL}/pages/profile.html`),
      });
      return json({ url: session.url });
    }

    // ── Pro subscription ──
    if (kind === 'pro') {
      const interval = body.interval === 'year' ? 'year' : 'month';

      // One active subscription per account.
      const { data: row } = await admin
        .from('users')
        .select('is_pro, stripe_subscription_id')
        .eq('id', user.id)
        .maybeSingle();
      if (row?.is_pro && row?.stripe_subscription_id) {
        return json({ error: 'already_pro', message: 'You already have an active Pro subscription.' }, 409);
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'aed',
            unit_amount: PRO_PRICES[interval],
            recurring: { interval },
            product_data: {
              name: interval === 'year' ? 'Swappo Pro — yearly' : 'Swappo Pro — monthly',
              description: '0% service fee, 3 boosts/month, 5 gift claims/month, no ads, Pro badge.',
            },
          },
        }],
        allow_promotion_codes: true,
        success_url: safeUrl(body.success_url, `${SITE_URL}/pages/pricing.html?checkout=success&kind=pro`),
        cancel_url:  safeUrl(body.cancel_url,  `${SITE_URL}/pages/pricing.html?checkout=cancel&kind=pro`),
        metadata: { kind: 'pro', user_id: user.id, interval },
        subscription_data: { metadata: { kind: 'pro', user_id: user.id, interval } },
      });
      return json({ url: session.url });
    }

    // ── One-off item boost ──
    if (kind === 'boost') {
      const tier = String(body.tier ?? '') as keyof typeof BOOST_TIERS;
      const itemId = String(body.item_id ?? '');
      const cfg = BOOST_TIERS[tier];
      if (!cfg)   return json({ error: 'Invalid boost tier' }, 400);
      if (!itemId) return json({ error: 'item_id required' }, 400);

      // The item must belong to the caller and be live.
      const { data: item } = await admin
        .from('items')
        .select('id, user_id, brand, model, status')
        .eq('id', itemId)
        .maybeSingle();
      if (!item || item.user_id !== user.id) return json({ error: 'Item not found' }, 404);
      if (item.status && !['active', 'available'].includes(String(item.status))) {
        return json({ error: 'Only active listings can be boosted' }, 400);
      }

      const title = `${item.brand ?? ''} ${item.model ?? ''}`.trim() || 'your listing';
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'aed',
            unit_amount: cfg.amount,
            product_data: {
              name: `Swappo ${cfg.label}`,
              description: `Boost "${title}" to the top of the Swap Market for ${cfg.days} day${cfg.days > 1 ? 's' : ''}.`,
            },
          },
        }],
        success_url: safeUrl(body.success_url, `${SITE_URL}/pages/product.html?id=${encodeURIComponent(itemId)}&checkout=success&kind=boost`),
        cancel_url:  safeUrl(body.cancel_url,  `${SITE_URL}/pages/product.html?id=${encodeURIComponent(itemId)}&checkout=cancel&kind=boost`),
        metadata: {
          kind: 'boost',
          user_id: user.id,
          item_id: itemId,
          tier,
          duration_days: String(cfg.days),
          amount_aed: String(cfg.amount / 100),
        },
      });
      return json({ url: session.url });
    }

    return json({ error: 'Unknown kind' }, 400);
  } catch (e: any) {
    console.error('[stripe-checkout]', e?.message ?? e);
    return json({ error: e?.message ?? 'Checkout failed' }, 500);
  }
});
