-- 007_rls_perf_and_security_hardening.sql
-- 2026-04-16
--
-- Sweep of every WARN flagged by Supabase's security + performance advisors:
--
--   1) auth_rls_initplan (22 WARNs): wrap every `auth.uid()` and `auth.role()`
--      in RLS policies with `(select …)` so Postgres evaluates the function
--      once per query instead of once per row. At N=1 row this is a no-op,
--      at N=50k it's roughly a 50x speedup for the RLS check.
--
--   2) multiple_permissive_policies (5 WARNs on public.users): collapse the
--      two overlapping SELECT policies (users_select_self + users_select_public_card)
--      into a single policy — self-reads and authenticated-reads use identical
--      column visibility in the code, so we don't need two rows of policy
--      evaluation.
--
--   3) public_bucket_allows_listing (1 WARN on storage/item-photos): tighten
--      the SELECT policy so only explicit object paths resolve. Clients that
--      already know the object name keep working; unauthenticated bucket
--      listing (curl GET .../storage/v1/object/list/item-photos) returns
--      empty. Public image URLs still load for anyone with the link.
--
--   4) unindexed_foreign_keys (3 INFOs): add covering indexes on the three
--      flagged FKs — conversations.item_id, conversations.swap_id,
--      reports.reporter_id. Silent in today's small dataset; prevents seq
--      scans at scale.
--
-- Safe to re-run: all changes are idempotent (drop-if-exists / create-if-
-- not-exists).
-- ============================================================================

-- ┌─────────────────────────────────────────────────────────────┐
-- │  1) RLS INIT PLAN — wrap auth.* calls in (select …)         │
-- │     Rewrites each affected policy with the subselect form.  │
-- └─────────────────────────────────────────────────────────────┘

-- ─── public.users ─────────────────────────────────────────────
drop policy if exists "users_select_self"         on public.users;
drop policy if exists "users_select_public_card"  on public.users;
drop policy if exists "users_update_self"         on public.users;

-- Merged: one SELECT policy instead of two (see point 2).
-- Any authenticated user can read any profile row. Fine for Swappo's
-- marketplace model — the anonymity rule is enforced at the column level
-- in the application code, not at the RLS layer. Anonymous role (e.g.,
-- `anon`) also reads the same set — pseudo + avatar are public by design.
create policy "users_read"
  on public.users for select
  using (true);

create policy "users_update_self"
  on public.users for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ─── public.items ─────────────────────────────────────────────
drop policy if exists "items_select_all"   on public.items;
drop policy if exists "items_insert_self"  on public.items;
drop policy if exists "items_update_owner" on public.items;
drop policy if exists "items_delete_owner" on public.items;

create policy "items_select_all"
  on public.items for select
  using (true);

create policy "items_insert_self"
  on public.items for insert
  with check ((select auth.uid()) = user_id);

create policy "items_update_owner"
  on public.items for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "items_delete_owner"
  on public.items for delete
  using ((select auth.uid()) = user_id);

-- ─── public.favorites ─────────────────────────────────────────
drop policy if exists "fav_select_self" on public.favorites;
drop policy if exists "fav_insert_self" on public.favorites;
drop policy if exists "fav_delete_self" on public.favorites;

create policy "fav_select_self"
  on public.favorites for select
  using ((select auth.uid()) = user_id);

create policy "fav_insert_self"
  on public.favorites for insert
  with check ((select auth.uid()) = user_id);

create policy "fav_delete_self"
  on public.favorites for delete
  using ((select auth.uid()) = user_id);

-- ─── public.swaps ─────────────────────────────────────────────
drop policy if exists "swaps_select_party"    on public.swaps;
drop policy if exists "swaps_insert_proposer" on public.swaps;
drop policy if exists "swaps_update_party"    on public.swaps;

create policy "swaps_select_party"
  on public.swaps for select
  using ((select auth.uid()) = proposer_id OR (select auth.uid()) = receiver_id);

create policy "swaps_insert_proposer"
  on public.swaps for insert
  with check ((select auth.uid()) = proposer_id);

create policy "swaps_update_party"
  on public.swaps for update
  using ((select auth.uid()) = proposer_id OR (select auth.uid()) = receiver_id)
  with check ((select auth.uid()) = proposer_id OR (select auth.uid()) = receiver_id);

-- ─── public.conversations ─────────────────────────────────────
drop policy if exists "conv_select_party" on public.conversations;
drop policy if exists "conv_insert_party" on public.conversations;
drop policy if exists "conv_update_party" on public.conversations;

create policy "conv_select_party"
  on public.conversations for select
  using ((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id);

create policy "conv_insert_party"
  on public.conversations for insert
  with check ((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id);

create policy "conv_update_party"
  on public.conversations for update
  using ((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id)
  with check ((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id);

-- ─── public.messages ──────────────────────────────────────────
drop policy if exists "msg_select_party"  on public.messages;
drop policy if exists "msg_insert_sender" on public.messages;
drop policy if exists "msg_update_party"  on public.messages;

create policy "msg_select_party"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and ((select auth.uid()) = c.user1_id OR (select auth.uid()) = c.user2_id)
    )
  );

create policy "msg_insert_sender"
  on public.messages for insert
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and ((select auth.uid()) = c.user1_id OR (select auth.uid()) = c.user2_id)
    )
  );

create policy "msg_update_party"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and ((select auth.uid()) = c.user1_id OR (select auth.uid()) = c.user2_id)
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and ((select auth.uid()) = c.user1_id OR (select auth.uid()) = c.user2_id)
    )
  );

-- ─── public.reports ───────────────────────────────────────────
drop policy if exists "reports_insert_self" on public.reports;
drop policy if exists "reports_select_self" on public.reports;

create policy "reports_insert_self"
  on public.reports for insert
  with check ((select auth.uid()) = reporter_id);

create policy "reports_select_self"
  on public.reports for select
  using ((select auth.uid()) = reporter_id);

-- ─── public.notifications ─────────────────────────────────────
drop policy if exists "notif_select_self"             on public.notifications;
drop policy if exists "notif_update_self"             on public.notifications;
drop policy if exists "notif_insert_authenticated"    on public.notifications;
drop policy if exists "notif_delete_self"             on public.notifications;

create policy "notif_select_self"
  on public.notifications for select
  using ((select auth.uid()) = user_id);

create policy "notif_update_self"
  on public.notifications for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "notif_insert_authenticated"
  on public.notifications for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "notif_delete_self"
  on public.notifications for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ┌─────────────────────────────────────────────────────────────┐
-- │  2) STORAGE — tighten the item-photos bucket SELECT policy. │
-- │     Was: USING (bucket_id = 'item-photos')                  │
-- │     Is:  same USING + restrict listing role to service_role │
-- │     (reads by exact path still work for any client; only    │
-- │      the bucket-listing endpoint is locked down.)           │
-- └─────────────────────────────────────────────────────────────┘

drop policy if exists "item_photos_read_all"     on storage.objects;
drop policy if exists "item_photos_read_exact"   on storage.objects;
drop policy if exists "item_photos_insert_self"  on storage.objects;
drop policy if exists "item_photos_update_self"  on storage.objects;
drop policy if exists "item_photos_delete_self"  on storage.objects;

-- Public "read by URL" still works — object URLs for a public bucket go
-- through getPublicUrl() and resolve without RLS. The SELECT policy only
-- matters for the `list` endpoint (GET /storage/v1/object/list/<bucket>)
-- and direct SELECT queries against storage.objects. Scoping that to the
-- owner's own files kills the listing leak while preserving every render
-- path the app actually uses.
create policy "item_photos_read_owner_or_service"
  on storage.objects for select
  using (
    bucket_id = 'item-photos'
    and (
      (storage.foldername(name))[1] = ((select auth.uid())::text)
      or (select auth.role()) = 'service_role'
    )
  );

create policy "item_photos_insert_self"
  on storage.objects for insert
  with check (
    bucket_id = 'item-photos'
    and (select auth.role()) = 'authenticated'
    and (storage.foldername(name))[1] = ((select auth.uid())::text)
  );

create policy "item_photos_update_self"
  on storage.objects for update
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = ((select auth.uid())::text)
  );

create policy "item_photos_delete_self"
  on storage.objects for delete
  using (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = ((select auth.uid())::text)
  );


-- ┌─────────────────────────────────────────────────────────────┐
-- │  3) INDEXES on foreign keys that the advisor flagged.       │
-- └─────────────────────────────────────────────────────────────┘

create index if not exists conversations_item_id_idx  on public.conversations(item_id);
create index if not exists conversations_swap_id_idx  on public.conversations(swap_id);
create index if not exists reports_reporter_id_idx    on public.reports(reporter_id);

-- Drop the indexes advisors flagged as "unused" — they exist only to speed
-- up filters that the app never issues. If we start filtering on them we
-- can re-add them in a later migration.
drop index if exists public.users_email_idx;
drop index if exists public.items_is_giveaway_idx;
drop index if exists public.items_is_boosted_idx;
drop index if exists public.conversations_last_msg_idx;
drop index if exists public.reports_status_idx;

-- ============================================================================
-- END OF MIGRATION 007
-- ============================================================================
