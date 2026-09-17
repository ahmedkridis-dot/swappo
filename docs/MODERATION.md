# Swappo — Moderation runbook

Two tools, both run as the database owner (Supabase SQL editor or
`npx supabase db query --linked --file …`). Nothing here is reachable from
the website: the functions are revoked from `anon` / `authenticated`.

## 1. Fake listing → account closed (automatic)

Rule: **one fake listing closes the account. No warnings.**

Set the listing's status to `suspended`; the trigger
`items_ban_owner_on_suspend` (migration 040) does the rest:

```sql
update public.items set status = 'suspended' where id = '<item uuid>';
```

Effects, in the same transaction:

| What | Result |
|------|--------|
| `users` | `is_banned = true`, `banned_at = now()`, `ban_reason = 'fake_listing'`, `is_suspended = true` (hides the member from `users_public`, so from every card and profile) |
| Their other listings (`available` / `reserved`) | `suspended` |
| Their `pending` swaps, offers and gift claims | `cancelled` |
| Notification (`kind = 'banned'`) | "Account closed — Your listing "…" was removed because it doesn't show a real item…" — also emailed (`send-swap-email`) |
| Site | banner "This account has been closed. Contact contact@swappo.ae.", publish / claim / offer / message controls disabled (`js/banned-guard.js`); RLS refuses `INSERT` on `items`, `swaps`, `messages` |
| Sign-in | still allowed — the member can read the explanation |

Nothing is deleted.

### Reinstating (mistake)

```sql
select public.admin_unban_user('member@example.com');
```

Clears `is_banned` / `banned_at` / `ban_reason` / `is_suspended`, and puts
every `suspended` listing back to `available`. To keep a specific listing
down, set it back to `removed` afterwards.

## 2. Hard suspension (sign-in blocked)

For abusive behaviour beyond a fake listing (harassment, fraud attempts):

```sql
select public.admin_suspend_user('member@example.com', 'reason');   -- migration 039
select public.admin_reinstate_user('member@example.com');
```

Blocks sign-in (`auth.users.banned_until`), ends every session, hides the
member's live listings (`removed`) and declines their open deals.
`admin_reinstate_user` reverses it (declined deals stay declined).

## 3. Checking a member

```sql
select id, email, pseudo, is_banned, banned_at, ban_reason, is_suspended, suspended_at
  from public.users where lower(email) = lower('member@example.com');
```
