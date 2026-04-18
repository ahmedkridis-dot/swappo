-- ============================================================
-- 015_badge_promotion_notification.sql
-- Emit an in-app badge_earned notification when a user crosses a
-- badge threshold (Newcomer → Swapper → Active → Pro → Elite → Legend).
--
-- Before this migration, bump_swap_count() silently updated the
-- users.badge column but never told the user. Ahmed did a real swap
-- and got no celebration — we fix that here.
--
-- Design choice: we insert into public.notifications with kind =
-- 'badge_earned'. The existing notifications_email_dispatch trigger
-- DOES NOT include this kind in its allow-list, so no email fires
-- (badges are an in-app celebration only).
-- ============================================================

create or replace function public.bump_swap_count(user_id_in uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_count int;
  new_badge text;
  old_badge text;
begin
  -- Capture the badge BEFORE we bump, so we know whether this swap
  -- actually promoted the user vs. just incremented the count.
  select badge into old_badge from public.users where id = user_id_in;

  update public.users
    set swap_count             = swap_count + 1,
        badge_last_activity_at = now()
    where id = user_id_in
    returning swap_count into new_count;

  new_badge := case
    when new_count >= 75 then 'legend'
    when new_count >= 30 then 'elite'
    when new_count >= 15 then 'pro'
    when new_count >= 5  then 'active'
    when new_count >= 1  then 'swapper'
    else 'newcomer'
  end;

  update public.users set badge = new_badge where id = user_id_in;

  -- Only notify on actual promotion (ignore "newcomer → newcomer"
  -- no-ops when old_badge is already newcomer and count stays at 0,
  -- although bump_swap_count is only called when a swap completes).
  if new_badge is distinct from coalesce(old_badge, 'newcomer') then
    insert into public.notifications (user_id, kind, title, message, url, payload)
    values (
      user_id_in,
      'badge_earned',
      'Badge unlocked',
      'You just earned the ' || initcap(new_badge) || ' badge!',
      '/pages/profile.html#badges',
      jsonb_build_object(
        'badge',      new_badge,
        'prev_badge', old_badge,
        'swap_count', new_count
      )
    );
  end if;
end;
$$;
