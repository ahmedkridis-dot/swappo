// ─────────────────────────────────────────────────────────────
//  Supabase Edge Function — check-photo
//  AI moderation of a listing photo at publish time (publier.html step 3).
//
//  POST { image_base64, mime, category, item_type? }   (JWT required)
//  → 200 { verdict: 'ok'|'reject'|'unsure', reason, confidence }
//  → 401 not signed in · 400 bad input · 429 rate limited (20 / user / hour)
//
//  Model: Claude Haiku 4.5 (vision) through the Anthropic Messages API.
//  Secret: ANTHROPIC_API_KEY (Supabase → Edge Functions → Secrets).
//  The photo is analysed and forgotten — only the verdict is logged in
//  public.photo_checks. Any failure (no key, timeout, quota, bad JSON)
//  returns { verdict: 'unsure', reason: 'check_unavailable' }: an outage
//  never blocks an honest member.
//
//  Deploy:  supabase functions deploy check-photo
// ─────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL = Deno.env.get('CHECK_PHOTO_MODEL') ?? 'claude-haiku-4-5-20251001';

const RATE_LIMIT_PER_HOUR = 20;
const MAX_BASE64_CHARS = 2_000_000; // ≈ 1.5 MB decoded
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VERDICTS = new Set(['ok', 'reject', 'unsure']);
const REASONS  = new Set(['no_item', 'screenshot_or_stock', 'wrong_category', 'person', 'prohibited', 'contact_info', 'unclear', 'check_unavailable', 'ok']);

const SYSTEM_PROMPT = `You are a listing moderator for a second-hand marketplace in the UAE.
Look at the photo and the declared category. Answer ONLY with JSON:
{"verdict":"ok"|"reject"|"unsure","reason":"no_item"|"screenshot_or_stock"|"wrong_category"|"person"|"prohibited"|"contact_info"|"unclear","confidence":0-1}

Say "reject" when the photo:
- does not show a physical object (wall, floor, sky, empty room, blank, black, blurred beyond recognition)
- is a screenshot of an app or website, a meme, a logo alone, or a stock/catalog image with a retailer watermark
- shows a person's face or body as the main subject instead of an item
- shows an item clearly unrelated to the declared category (e.g. category "furniture", photo of a phone)
- shows prohibited goods: weapons, drugs, alcohol, tobacco, adult items, live animals, counterfeit-branded goods, medicines
- contains contact information ADDED by the seller: a phone number, WhatsApp/Telegram mention, email, URL, social handle or QR code that is handwritten, on a sticker, on a sign held in frame, overlaid as text, or shown on a screen. Read all visible text carefully, in any language and digit system (Arabic-Indic digits included).

IMPORTANT — text that is part of the item itself is NORMAL and must NOT be rejected:
- book covers, magazines, comics, DVDs, CDs, video-game boxes, board games: title, author, publisher, ISBN, publisher website, price sticker — all fine. A book IS a physical item, not a "document".
- product packaging, labels, brand names, manuals, care tags, serial numbers, printed brand URLs on a box — fine.
- a phone, tablet, TV or laptop for sale showing its own screen (home screen, settings, "about" page) — fine, unless the screen displays a phone number or a chat app conversation.
Only reject for "contact_info" when the contact detail was clearly put there by the seller to be reached outside the platform.

Say "ok" when it is a real photo of a real item, taken by the user, matching the category, even if imperfect (bad light, cluttered background are fine).
Say "unsure" only if you truly cannot tell.`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const UNAVAILABLE = { verdict: 'unsure', reason: 'check_unavailable', confidence: 0 };

// Extract the JSON object from the model's text answer (tolerates prose around it).
export function parseVerdict(text: string): { verdict: string; reason: string; confidence: number } | null {
  const a = text.indexOf('{'); const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    const o = JSON.parse(text.slice(a, b + 1));
    const verdict = String(o.verdict ?? '').toLowerCase();
    let reason = String(o.reason ?? '').toLowerCase();
    const confidence = Math.max(0, Math.min(1, Number(o.confidence ?? 0) || 0));
    if (!VERDICTS.has(verdict)) return null;
    if (verdict === 'ok') reason = 'ok';
    if (!REASONS.has(reason)) reason = 'unclear';
    return { verdict, reason, confidence };
  } catch { return null; }
}

async function askModel(imageBase64: string, mime: string, category: string, itemType: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: imageBase64 } },
            { type: 'text', text: `Declared category: ${category}. Item type: ${itemType || 'not specified'}.` },
          ],
        }],
      }),
    });
    if (!resp.ok) {
      console.error('[check-photo] anthropic', resp.status, (await resp.text()).slice(0, 300));
      return null;
    }
    const data = await resp.json();
    const text = Array.isArray(data?.content) ? data.content.map((c: any) => c?.text ?? '').join('\n') : '';
    return parseVerdict(text);
  } catch (e) {
    console.error('[check-photo] anthropic call failed', (e as Error)?.message ?? e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ── Who is calling? ──
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return json({ error: 'Not signed in' }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userErr } = await userClient.auth.getUser(jwt);
  if (userErr || !user) return json({ error: 'Not signed in' }, 401);

  // ── Input ──
  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const imageBase64 = String(body.image_base64 ?? '').replace(/^data:[^,]+,/, '');
  const mime = String(body.mime ?? 'image/jpeg').toLowerCase();
  const category = String(body.category ?? '').slice(0, 40) || 'other';
  const itemType = String(body.item_type ?? '').slice(0, 60);
  if (!imageBase64 || imageBase64.length > MAX_BASE64_CHARS) return json({ error: 'image_too_large_or_missing' }, 400);
  if (!ALLOWED_MIME.has(mime)) return json({ error: 'unsupported_mime' }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  // ── Rate limit: 20 checks / user / hour ──
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin.from('photo_checks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).gte('created_at', hourAgo);
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return json({ error: 'rate_limited', message: 'Too many attempts, try again later' }, 429);
  }

  // ── Verdict ──
  let result = UNAVAILABLE;
  if (ANTHROPIC_API_KEY) {
    const v = await askModel(imageBase64, mime, category, itemType);
    if (v) result = v;
  } else {
    console.warn('[check-photo] ANTHROPIC_API_KEY not set — returning unsure');
  }

  // ── Log (never the image) ──
  try {
    await admin.from('photo_checks').insert({
      user_id: user.id, category, verdict: result.verdict, reason: result.reason, confidence: result.confidence,
    });
  } catch (e) { console.error('[check-photo] log failed', (e as Error)?.message ?? e); }

  return json(result);
});
