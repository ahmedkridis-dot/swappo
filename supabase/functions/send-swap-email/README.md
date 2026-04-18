# Swappo — Transactional email activation runbook

Everything is in place except the 3 secrets + the trigger flip. Follow
these steps **once** after the Resend domain is verified.

---

## 0. Prerequisites

- [ ] Resend domain `swappo.ae` shows **Verified** (green check)
- [ ] You have the Resend API key (starts with `re_…`, “Sending access”)
- [ ] You have the Supabase CLI installed locally (`brew install supabase/tap/supabase`)
- [ ] You're logged in: `supabase login`

---

## 1. Deploy the Edge Function

```bash
cd /Users/kardous/Developer/swappo
supabase functions deploy send-swap-email --no-verify-jwt
```

The `--no-verify-jwt` flag is correct here: the function is never hit
from the browser, only from the DB trigger which passes the service
role key in the `Authorization` header. We validate the caller inside
the function by reading the service role from env (already auto-set).

After deploy you'll see:
```
https://<project-ref>.functions.supabase.co/send-swap-email
```
Copy that URL — you need it in step 3.

---

## 2. Set the Resend secrets

```bash
supabase secrets set RESEND_API_KEY=re_XXXXXXXXXXXXXXXX
supabase secrets set RESEND_FROM='Swappo <noreply@send.swappo.ae>'
supabase secrets set SITE_URL='https://swappo.ae'
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected — don't
set them manually.

---

## 3. Store the function URL + service key in the Supabase Vault

Open the SQL editor in the Supabase dashboard and run:

```sql
-- Function URL (replace <project-ref> with yours)
select vault.create_secret(
  'https://<project-ref>.functions.supabase.co/send-swap-email',
  'swappo_email_fn_url'
);

-- Service role key (find it in Dashboard → Settings → API → service_role)
select vault.create_secret(
  'eyJhbGciOi...',
  'swappo_service_role_key'
);
```

These are needed because pg_net (Postgres) can't read Deno env vars.
The trigger reads from the Vault at runtime via
`_swappo_email_fn_url()` / `_swappo_service_role_key()`.

---

## 4. Flip the trigger ON

```sql
select public.toggle_email_trigger(true);
-- Expected output: email trigger ENABLED
```

Done — next `INSERT INTO notifications` will fire the function.

---

## 5. Smoke test

1. Log in as two demo users in two browsers (`free@swappo.ae` and
   `sara@test.com` / `test123`)
2. As Sara, propose a swap on one of Khalid's items
3. Within a few seconds, `free@swappo.ae`'s inbox should receive the
   email (subject: "New swap offer on your …")

If it doesn't arrive:

```sql
-- Recent pg_net calls (last 10)
select id, url, status_code, content_type, created
from net._http_response order by created desc limit 10;

-- Recent notifications that triggered
select id, kind, user_id, emailed_at, created_at
from public.notifications
where created_at > now() - interval '10 minutes'
order by created_at desc;

-- Recent function errors
-- (Dashboard → Edge Functions → send-swap-email → Logs)
```

---

## 6. Rollback (if needed)

```sql
select public.toggle_email_trigger(false);
-- Expected: email trigger DISABLED
```

In-app notifications keep working. Only the email side stops.
