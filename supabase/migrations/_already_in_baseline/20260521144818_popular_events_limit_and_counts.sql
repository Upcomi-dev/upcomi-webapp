-- Keep the auto "Populaires" collection deterministic and capped at 10 favourited events.
CREATE OR REPLACE FUNCTION public.get_popular_events(p_limit int DEFAULT 10)
RETURNS TABLE(event_id int, fav_count bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
WITH normalized_limit AS (
  SELECT GREATEST(0, LEAST(COALESCE(p_limit, 10), 10)) AS value
)
SELECT event_id, fav_count
FROM (
  SELECT
    fe.event AS event_id,
    COUNT(*)::bigint AS fav_count,
    MIN(e."dateEvent") AS event_date
  FROM public.favourite_events fe
  JOIN public.events e ON e.id = fe.event
  WHERE e."dateEvent" >= CURRENT_DATE
    AND e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
    AND e.verifie = true
  GROUP BY fe.event
  HAVING COUNT(*) > 0
) popular
ORDER BY fav_count DESC, event_date ASC NULLS LAST, event_id ASC
LIMIT (SELECT value FROM normalized_limit);
$$;

CREATE OR REPLACE FUNCTION public.get_event_favourite_counts(p_event_ids int[])
RETURNS TABLE(event_id int, fav_count bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    e.id AS event_id,
    COUNT(fe.id)::bigint AS fav_count
  FROM public.events e
  LEFT JOIN public.favourite_events fe ON fe.event = e.id
  WHERE e.id = ANY(COALESCE(p_event_ids, ARRAY[]::int[]))
  GROUP BY e.id;
$$;
