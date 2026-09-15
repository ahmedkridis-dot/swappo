-- Swappo — Migration 029: item-photos bucket limit 2 MB → 5 MB
-- The client resizes to 1920 px / WebP and targets < 1.8 MB; the bucket
-- limit is only a safety net and must stay above the client target
-- (previously 2 MB vs a 3 MB client cap → 413 "exceeded the maximum
-- allowed size" on large phone photos). Idempotent.
UPDATE storage.buckets
   SET file_size_limit = 5242880
 WHERE id = 'item-photos';
