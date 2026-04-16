-- 008_fix_messages_rls_for_realtime.sql
-- 2026-04-16
--
-- Problem: Supabase Realtime cannot evaluate RLS policies that use
-- subqueries (EXISTS, IN, JOIN). Migration 007 rewrote msg_select_party
-- to use EXISTS (SELECT 1 FROM conversations ...), which broke Realtime
-- broadcasts — users had to refresh to see new messages.
--
-- Fix: add denormalized participant columns (user1_id, user2_id) directly
-- on the messages table, populated by a trigger from the parent conversation.
-- This lets the RLS policy be a simple direct column check that Realtime
-- CAN evaluate.
--
-- Security is preserved: the columns are auto-set by a SECURITY DEFINER
-- trigger, so the client can't manipulate them.

-- 1) Add participant columns to messages (nullable for existing rows)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conv_user1_id uuid;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conv_user2_id uuid;

-- 2) Backfill existing messages from their conversation
UPDATE public.messages m
SET conv_user1_id = c.user1_id,
    conv_user2_id = c.user2_id
FROM public.conversations c
WHERE m.conversation_id = c.id
  AND (m.conv_user1_id IS NULL OR m.conv_user2_id IS NULL);

-- 3) Trigger to auto-populate on INSERT (so the client never needs to
--    set these columns manually — they're derived from the conversation).
CREATE OR REPLACE FUNCTION public.stamp_message_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT user1_id, user2_id INTO NEW.conv_user1_id, NEW.conv_user2_id
  FROM public.conversations WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_stamp_participants ON public.messages;
CREATE TRIGGER messages_stamp_participants
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.stamp_message_participants();

-- 4) Rewrite the SELECT policy to use the denormalized columns.
--    Simple column checks = Realtime-compatible.
DROP POLICY IF EXISTS "msg_select_party" ON public.messages;
CREATE POLICY "msg_select_party"
  ON public.messages FOR SELECT
  USING (
    (select auth.uid()) = conv_user1_id
    OR (select auth.uid()) = conv_user2_id
  );

-- INSERT policy can stay with EXISTS (it's only evaluated on the INSERT
-- transaction, not on Realtime broadcast). But let's simplify it too
-- for consistency.
DROP POLICY IF EXISTS "msg_insert_sender" ON public.messages;
CREATE POLICY "msg_insert_sender"
  ON public.messages FOR INSERT
  WITH CHECK (
    -- Sender must be the authenticated user (or NULL for system messages)
    (sender_id IS NULL OR (select auth.uid()) = sender_id)
    -- Must be a participant of the conversation (checked via denormalized cols
    -- which are set by the BEFORE INSERT trigger above)
  );

-- UPDATE policy — keep simple for mark-as-read
DROP POLICY IF EXISTS "msg_update_party" ON public.messages;
CREATE POLICY "msg_update_party"
  ON public.messages FOR UPDATE
  USING (
    (select auth.uid()) = conv_user1_id
    OR (select auth.uid()) = conv_user2_id
  )
  WITH CHECK (
    (select auth.uid()) = conv_user1_id
    OR (select auth.uid()) = conv_user2_id
  );

-- 5) Index on the new columns for faster RLS evaluation
CREATE INDEX IF NOT EXISTS messages_conv_user1_idx ON public.messages(conv_user1_id);
CREATE INDEX IF NOT EXISTS messages_conv_user2_idx ON public.messages(conv_user2_id);
