-- ============================================================
-- 051_live_stats_cumulative.sql
-- Eco ticker (Ahmed, 2026-09-21): "gifts today" / "items sold today" /
-- "+0 in the last hour" show zeros most of the day on a young marketplace.
-- The ticker now shows counters that never reset: gifts given, items sold,
-- members. get_live_stats() gains 'sold_total' (gifts_total and members
-- already exist since 037). Daily keys stay for older cached pages.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_live_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today_start timestamptz := (CURRENT_DATE AT TIME ZONE 'Asia/Dubai');
BEGIN
  RETURN jsonb_build_object(
    'co2_kg_saved',       ROUND(COALESCE((SELECT SUM(co2_kg_saved) FROM public.swap_events), 0))::int,
    'items_swapped',      COALESCE((SELECT SUM(items_count) FROM public.swap_events), 0)::int,
    'gifts_today',        COALESCE((SELECT SUM(items_count) FROM public.swap_events
                                     WHERE event_type = 'gift'  AND created_at >= v_today_start), 0)::int,
    'sold_today',         COALESCE((SELECT SUM(items_count) FROM public.swap_events
                                     WHERE event_type = 'purchase' AND created_at >= v_today_start), 0)::int,
    'items_last_hour',    COALESCE((SELECT SUM(items_count) FROM public.swap_events
                                     WHERE created_at >= now() - INTERVAL '1 hour'), 0)::int,
    'happy_swappers',     COALESCE((
                            SELECT COUNT(DISTINCT uid) FROM (
                              SELECT s.proposer_id AS uid FROM public.swap_events se
                                JOIN public.swaps s ON s.id = se.swap_id
                                WHERE s.proposer_id IS NOT NULL
                              UNION
                              SELECT s.receiver_id AS uid FROM public.swap_events se
                                JOIN public.swaps s ON s.id = se.swap_id
                                WHERE s.receiver_id IS NOT NULL
                            ) u
                          ), 0)::int,
    'value_exchanged_aed',ROUND(COALESCE((SELECT SUM(value_aed) FROM public.swap_events), 0))::int,
    -- Counters that never reset (eco ticker + Our Impact page)
    'gifts_total',        COALESCE((SELECT SUM(items_count) FROM public.swap_events WHERE event_type = 'gift'), 0)::int,
    'sold_total',         COALESCE((SELECT SUM(items_count) FROM public.swap_events WHERE event_type = 'purchase'), 0)::int,
    'swaps_completed',    COALESCE((SELECT COUNT(*) FROM public.swaps WHERE status = 'completed'), 0)::int,
    'members',            COALESCE((SELECT COUNT(*) FROM public.users WHERE COALESCE(is_deleted, false) = false), 0)::int,
    'generated_at',       now()
  );
END;
$function$;
