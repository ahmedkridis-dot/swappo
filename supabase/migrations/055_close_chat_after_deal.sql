-- ============================================================
-- 055_close_chat_after_deal.sql
-- A finished deal closes its chat (Ahmed, 2026-09-22: "les deals finis
-- doivent se terminer sur le chat et le Deal Tracker, et il faut fermer la
-- possibilité de chatter, pour éviter toute gêne après le deal").
--
-- 1. msg_insert_sender: a member can only write in a conversation whose deal
--    is still open. Once the swap is completed / cancelled / declined /
--    expired, the thread is read-only for both sides — enforced here, not
--    only by hiding the composer.
-- 2. When a swap becomes 'completed', one system line closes the thread
--    ("Deal completed — this chat is now closed."). cancel_swap_deal (054)
--    already writes its own line for a cancelled deal.
--
-- System lines (sender_id null) are written by SECURITY DEFINER functions
-- and triggers, which are not subject to RLS.
-- ============================================================

create or replace function public.conversation_is_open(p_conv_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select s.status not in ('completed', 'cancelled', 'declined', 'expired')
      from public.conversations c
      join public.swaps s on s.id = c.swap_id
     where c.id = p_conv_id
  ), true);
$$;
revoke all on function public.conversation_is_open(uuid) from public, anon;
grant execute on function public.conversation_is_open(uuid) to authenticated;

drop policy if exists "msg_insert_sender" on public.messages;
create policy "msg_insert_sender" on public.messages for insert
  with check (
    (select auth.uid()) = sender_id
    and not public.current_user_is_banned()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and ((select auth.uid()) = c.user1_id or (select auth.uid()) = c.user2_id)
    )
    and public.conversation_is_open(messages.conversation_id)
  );

create or replace function public.close_chat_on_deal_completed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.messages (conversation_id, sender_id, content, is_system)
    select c.id, null, '🎉 Deal completed — this chat is now closed. Thank you for swapping!', true
      from public.conversations c
     where c.swap_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.close_chat_on_deal_completed() from public, anon, authenticated;

drop trigger if exists close_chat_on_deal_completed on public.swaps;
create trigger close_chat_on_deal_completed
  after update of status on public.swaps
  for each row execute function public.close_chat_on_deal_completed();
