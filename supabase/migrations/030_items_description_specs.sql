-- Swappo — Migration 030: free-text description + structured specs on items
-- description: shown on the product page under the specs table (all categories).
-- specs: category-specific attributes as JSON (vehicles: mileage_km, fuel,
--        transmission, body_type, regional_specs …) so new attributes never
--        need a schema change. Table-level grants on items already cover
--        new columns. Idempotent.
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.items ADD CONSTRAINT items_description_len CHECK (description IS NULL OR char_length(description) <= 2000) NOT VALID;
