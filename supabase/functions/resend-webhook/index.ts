// ============================================================
//  Supabase Edge Function — resend-webhook
//  Receives Resend's webhooks (email.delivered, email.bounced, …) and
//  stores them in public.email_events (migration 050), so delivery can be
//  followed from the database — no Resend API key needed anywhere.
//
//  Security: every request must carry a valid Svix signature made with the
//  webhook's signing secret. Without the secret the function refuses all.
//
//  Env vars:
//    RESEND_WEBHOOK_SECRET      — "whsec_…" shown by Resend when the webhook
//                                 is created (set it in Supabase → Edge
//                                 Functions → Secrets, never in chat)
//    SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — auto-injected
//
//  Deploy:  supabase functions deploy resend-webhook --no-verify-jwt
//  Resend:  Webhooks → Add endpoint →
//           https://cbhdjqionkvqiflmqchu.supabase.co/functions/v1/resend-webhook
// ============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TOLERANCE_S = 5 * 60;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const bytesToB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Svix: HMAC-SHA256( "<id>.<timestamp>.<raw body>" ) with the base64 part of
// the "whsec_…" secret; the header lists one or more "v1,<base64>" values.
async function verify(id: string, ts: string, body: string, header: string): Promise<boolean> {
  const t = Number(ts);
  if (!id || !t || Math.abs(Date.now() / 1000 - t) > TOLERANCE_S) return false;
  const key = await crypto.subtle.importKey(
    'raw', b64ToBytes(SECRET.replace(/^whsec_/, '')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = bytesToB64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  return header.split(' ').some((part) => {
    const [ver, val] = part.split(',');
    return ver === 'v1' && !!val && safeEqual(val, sig);
  });
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!SECRET) return json({ error: 'webhook_secret_not_configured' }, 503);

  const raw = await req.text();
  const id = req.headers.get('svix-id') ?? '';
  const ok = await verify(id, req.headers.get('svix-timestamp') ?? '', raw, req.headers.get('svix-signature') ?? '')
    .catch(() => false);
  if (!ok) return json({ error: 'invalid_signature' }, 401);

  let evt: any;
  try { evt = JSON.parse(raw); } catch { return json({ error: 'invalid_json' }, 400); }
  const data = evt?.data ?? {};

  // Our emails carry tags: [{ name: 'kind', value: '<notification kind>' }]
  let kind: string | null = null;
  const tags = data.tags;
  if (Array.isArray(tags)) kind = tags.find((t: any) => t?.name === 'kind')?.value ?? null;
  else if (tags && typeof tags === 'object') kind = (tags as any).kind ?? null;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.from('email_events').upsert({
    svix_id: id,
    type: String(evt?.type ?? 'unknown'),
    email_id: data.email_id ?? null,
    recipient: Array.isArray(data.to) ? (data.to[0] ?? null) : (data.to ?? null),
    subject: data.subject ?? null,
    kind,
    detail: { bounce: data.bounce ?? null, click: data.click ?? null, reason: data.reason ?? null },
    occurred_at: evt?.created_at ?? new Date().toISOString(),
  }, { onConflict: 'svix_id', ignoreDuplicates: true });
  if (error) {
    console.error('[resend-webhook] insert failed', error.message);
    return json({ error: 'store_failed' }, 500);   // Resend retries
  }
  return json({ ok: true });
});
