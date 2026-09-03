

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE SCHEMA IF NOT EXISTS "auth";

CREATE SCHEMA IF NOT EXISTS "public";

ALTER SCHEMA "public" OWNER TO "pg_database_owner";

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE OR REPLACE FUNCTION "public"."broadcast_testflight_notification"("p_title" "text" DEFAULT '🚀 Nouvelle version de l’app'::"text", "p_body" "text" DEFAULT 'Installez-la via TestFlight et découvrez les nouveautés'::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO notifications (title, body, user_id, redirect, redirect_id)
  SELECT
    p_title,
    p_body,
    u.uid,
    NULL, 
    NULL
  FROM users u
  WHERE u.fcm_token IS NOT NULL;
END;
$$;

ALTER FUNCTION "public"."broadcast_testflight_notification"("p_title" "text", "p_body" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."create_profile_for_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
  INSERT INTO public.users(uid, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;$$;

ALTER FUNCTION "public"."create_profile_for_new_user"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."debug_get_filtered_events"("_start_date" "text" DEFAULT NULL::"text", "_end_date" "text" DEFAULT NULL::"text") RETURNS TABLE("start_date_received" "text", "end_date_received" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT _start_date, _end_date;
END;
$$;

ALTER FUNCTION "public"."debug_get_filtered_events"("_start_date" "text", "_end_date" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."delete_auth_user"("user_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
BEGIN
  -- Supprimer d'abord les identities liées
  DELETE FROM auth.identities WHERE user_id = user_uuid;

  -- Supprimer les sessions
  DELETE FROM auth.sessions WHERE user_id = user_uuid;

  -- Supprimer les refresh tokens (user_id est varchar dans cette table)
  DELETE FROM auth.refresh_tokens WHERE user_id = user_uuid::text;

  -- Supprimer les mfa factors
  DELETE FROM auth.mfa_factors WHERE user_id = user_uuid;

  -- Supprimer l'utilisateur
  DELETE FROM auth.users WHERE id = user_uuid;
END;
$$;

ALTER FUNCTION "public"."delete_auth_user"("user_uuid" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."ensure_organisateur"("organizer_name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  normalized_name text := btrim(organizer_name);
  existing_name text;
begin
  if normalized_name = '' then
    raise exception 'Organizer name is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(lower(normalized_name), 0));

  select btrim(o.nom_orga)
    into existing_name
    from public.organisateurs o
   where lower(btrim(o.nom_orga)) = lower(normalized_name)
   order by o.id
   limit 1;

  if existing_name is not null then
    return existing_name;
  end if;

  insert into public.organisateurs (nom_orga)
  values (normalized_name);

  return normalized_name;
end;
$$;

ALTER FUNCTION "public"."ensure_organisateur"("organizer_name" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_all_users"("current_u" "text", "term" "text" DEFAULT NULL::"text") RETURNS TABLE("user_id" "uuid", "user_name" "text", "user_avatar" "text", "total_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.uid AS user_id,
        u.name AS user_name,
        u.avatar_url AS user_avatar,
        COUNT(*) OVER () AS total_count
    FROM users u
    WHERE u.uid != current_u::uuid -- Exclure l'utilisateur actuel
      AND u.uid NOT IN (
          SELECT f.friend_id
          FROM friendships f
          WHERE f.user_id = current_u::uuid
            AND f.status = 'accepted' -- Exclure les amis existants
      )
      AND (term IS NULL OR u.name ILIKE '%' || term || '%'); -- Recherche par nom si fourni
    --ORDER BY u.name ASC; -- Optionnel : Tri par nom
END;
$$;

ALTER FUNCTION "public"."get_all_users"("current_u" "text", "term" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_event_favourite_counts"("p_event_ids" integer[]) RETURNS TABLE("event_id" integer, "fav_count" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    e.id AS event_id,
    COUNT(fe.id)::bigint AS fav_count
  FROM public.events e
  LEFT JOIN public.favourite_events fe ON fe.event = e.id
  WHERE e.id = ANY(COALESCE(p_event_ids, ARRAY[]::int[]))
  GROUP BY e.id;
$$;

ALTER FUNCTION "public"."get_event_favourite_counts"("p_event_ids" integer[]) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_event_likes"("event_id" bigint, "c_user" "uuid") RETURNS TABLE("user_id" "uuid", "user_name" "text", "user_image" "text", "total_likes" integer, "liked_by_current_user" boolean, "female_ratio" numeric)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  with
  like_count as (
    select
      fe.event,
      count(*) filter (where fe.user_id != c_user)::int as like_total
    from public.favourite_events fe
    where fe.event = event_id
    group by fe.event
  ),
  user_liked as (
    select
      count(*) > 0 as liked
    from public.favourite_events fe
    where fe.user_id = c_user
      and fe.event = event_id
  ),
  liked_users as (
    select
      up.uid as user_id,
      up.name as user_name,
      up.avatar_url as user_image
    from public.favourite_events fe
    join public.user_public up on up.uid = fe.user_id
    where fe.event = event_id
      and fe.user_id != c_user
  )
  select
    lu.user_id,
    lu.user_name,
    lu.user_image,
    coalesce(lc.like_total, 0) as total_likes,
    coalesce((select ul.liked from user_liked ul), false) as liked_by_current_user,
    0::numeric as female_ratio
  from liked_users lu
  left join like_count lc on true

  union all

  select
    null::uuid,
    null::text,
    'vide'::text,
    coalesce((select lc2.like_total from like_count lc2), 0),
    coalesce((select ul2.liked from user_liked ul2), false),
    0::numeric
  where not exists (select 1 from liked_users);
end;
$$;

ALTER FUNCTION "public"."get_event_likes"("event_id" bigint, "c_user" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_favourite_events"("p_user_id" "uuid", "p_upcoming" boolean DEFAULT NULL::boolean) RETURNS TABLE("event_id" bigint, "event_name" "text", "event_image" "text", "event_date" "date", "event_date2" "text", "is_upcoming" boolean, "days_until_event" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS event_id,
    e."nomEvent" AS event_name,
    e."image" AS event_image,
    e."dateEvent"::DATE AS event_date,
    e."dateEvent2" AS event_date2,
    (e."dateEvent" >= CURRENT_DATE) AS is_upcoming,
     CASE 
      WHEN e."dateEvent" >= CURRENT_DATE THEN 
        (e."dateEvent" - CURRENT_DATE)::INT
      ELSE 
        NULL
    END AS days_until_event
  FROM favourite_events fe
  JOIN events e ON fe.event = e.id
  WHERE fe.user_id = p_user_id
  AND (
    p_upcoming IS NULL
    OR (p_upcoming = TRUE AND e."dateEvent" >= CURRENT_DATE)
    OR (p_upcoming = FALSE AND e."dateEvent" < CURRENT_DATE)
  )
  ORDER BY e."dateEvent" ASC;
END;
$$;

ALTER FUNCTION "public"."get_favourite_events"("p_user_id" "uuid", "p_upcoming" boolean) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_favourite_orga"("p_user_id" "uuid") RETURNS TABLE("orga_id" bigint, "orga_name" "text", "orga_image" "text", "is_empty" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH orga_list AS (
    SELECT
      o.id AS orga_id,
      o."nom_orga" AS orga_name,
      o."image" AS orga_image,
      FALSE AS is_empty
    FROM favourite_organisateurs fo
    JOIN organisateurs o ON fo.orga = o.id
    WHERE fo.user_id = p_user_id
  )
  SELECT * FROM orga_list

  UNION ALL

  SELECT
    NULL::BIGINT AS orga_id,
    NULL::TEXT AS orga_name,
    NULL::TEXT AS orga_image,
    TRUE AS is_empty
  WHERE NOT EXISTS (SELECT 1 FROM orga_list);
END;
$$;

ALTER FUNCTION "public"."get_favourite_orga"("p_user_id" "uuid") OWNER TO "postgres";

CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";

CREATE TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent" (
    PARSER = "pg_catalog"."default" );

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "asciiword" WITH "extensions"."unaccent", "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "word" WITH "extensions"."unaccent", "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "numword" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "email" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "url" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "host" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "sfloat" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "version" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "hword_numpart" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "hword_part" WITH "extensions"."unaccent", "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "hword_asciipart" WITH "extensions"."unaccent", "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "numhword" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "asciihword" WITH "extensions"."unaccent", "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "hword" WITH "extensions"."unaccent", "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "url_path" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "file" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "float" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "int" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent"
    ADD MAPPING FOR "uint" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."upcomi_unaccent" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" bigint NOT NULL,
    "nomEvent" "text",
    "dateEvent" "date",
    "dateEvent2" "text" DEFAULT 'EMPTY'::"text",
    "dateEventLongue" "text",
    "villeDepart" "text",
    "paysDepart" "text",
    "dateInscription" "date",
    "inscriptions_ouvertes" boolean,
    "clotureInscription" "date",
    "nb_sousEvents" smallint DEFAULT '1'::smallint,
    "URL" "text",
    "description" "text",
    "organisateur" "text",
    "image" "text",
    "bike_type" "text",
    "distance" "text",
    "catégorie" "text",
    "distance_range" "text",
    "sous_event1" "text",
    "sous_event2" "text",
    "url_tracking" "text",
    "tag" boolean DEFAULT false,
    "nature_tag" "text",
    "Dotwatching" boolean DEFAULT false,
    "type_event" "text",
    "region" "text",
    "budget" "text" DEFAULT 'Autre'::"text",
    "verifie" boolean DEFAULT false NOT NULL,
    "AlaUne" bigint,
    "dateFin" "date",
    "notified" boolean DEFAULT false NOT NULL,
    "mint" boolean DEFAULT false NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "distance_range_filter" "text",
    "date_inscription" "date",
    "search_fts" "tsvector" GENERATED ALWAYS AS (((((("setweight"("to_tsvector"('"public"."upcomi_unaccent"'::"regconfig", COALESCE("nomEvent", ''::"text")), 'A'::"char") || "setweight"("to_tsvector"('"public"."upcomi_unaccent"'::"regconfig", COALESCE("organisateur", ''::"text")), 'B'::"char")) || "setweight"("to_tsvector"('"public"."upcomi_unaccent"'::"regconfig", COALESCE("villeDepart", ''::"text")), 'B'::"char")) || "setweight"("to_tsvector"('"public"."upcomi_unaccent"'::"regconfig", COALESCE("paysDepart", ''::"text")), 'C'::"char")) || "setweight"("to_tsvector"('"public"."upcomi_unaccent"'::"regconfig", COALESCE("type_event", ''::"text")), 'C'::"char")) || "setweight"("to_tsvector"('"public"."upcomi_unaccent"'::"regconfig", COALESCE("bike_type", ''::"text")), 'C'::"char"))) STORED,
    "slug" "text" NOT NULL,
    CONSTRAINT "events_slug_format_check" CHECK (("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text"))
);

ALTER TABLE "public"."events" OWNER TO "postgres";

COMMENT ON COLUMN "public"."events"."tag" IS 'Tag spécifique sur un event?';

COMMENT ON COLUMN "public"."events"."nature_tag" IS 'Texte du tag à afficher';

COMMENT ON COLUMN "public"."events"."Dotwatching" IS 'A indiquer pour la page détails de l''event';

COMMENT ON COLUMN "public"."events"."type_event" IS 'Course / Aventure / Brevet - A construire à partir des sous-events. N''est pas destinée à être affichée mais à utiliser pour l''API Get de filtres';

COMMENT ON COLUMN "public"."events"."region" IS 'A implémenter automatiquement => si pays = France => France, si pays = autre = Etranger';

COMMENT ON COLUMN "public"."events"."budget" IS 'A implémenter => définir la règle // petit budget vs rien indiqué';

COMMENT ON COLUMN "public"."events"."AlaUne" IS 'Défini l''ordre d''apparition à la une';

CREATE OR REPLACE FUNCTION "public"."get_filtered_events"("_term" "text" DEFAULT NULL::"text", "_start_date" "text" DEFAULT ''::"text", "_end_date" "text" DEFAULT ''::"text", "_distance_range" "text"[] DEFAULT ARRAY[]::"text"[], "_bike_types" "text"[] DEFAULT ARRAY[]::"text"[], "_ranking" "text"[] DEFAULT ARRAY[]::"text"[], "_region" "text"[] DEFAULT ARRAY[]::"text"[], "_budget" "text" DEFAULT NULL::"text", "_limit" integer DEFAULT 30, "_offset" integer DEFAULT 0) RETURNS SETOF "public"."events"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT e.*
    FROM events e
    WHERE 
        -- toujours imposé
        e.verifie = true
        AND e.latitude IS NOT NULL
        AND e.longitude IS NOT NULL
        AND
        (
            /* Branche 1 : recherche mot-clé => bypass des autres filtres */
            (
                COALESCE(NULLIF(TRIM(_term), ''), NULL) IS NOT NULL
                AND (
                    LOWER(e."nomEvent") LIKE '%' || LOWER(_term) || '%'
                    OR LOWER(e.organisateur) LIKE '%' || LOWER(_term) || '%'
                    OR LOWER(e."paysDepart") LIKE '%' || LOWER(_term) || '%'
                    OR LOWER(e."villeDepart") LIKE '%' || LOWER(_term) || '%'
                )
            )

            OR

            /* Branche 2 : pas de mot-clé => appliquer tous les filtres habituels */
            (
                COALESCE(NULLIF(TRIM(_term), ''), NULL) IS NULL

                -- Dates
                AND (COALESCE(NULLIF(_start_date, ''), NULL) IS NULL OR e."dateEvent" >= TO_DATE(_start_date, 'YYYY-MM-DD'))
                AND (COALESCE(NULLIF(_end_date, ''), NULL) IS NULL OR e."dateEvent" <= TO_DATE(_end_date, 'YYYY-MM-DD'))

                -- Distance
                AND (
                    array_length(_distance_range, 1) IS NULL OR
                    EXISTS (
                        SELECT 1
                        FROM unnest(_distance_range) AS range
                        WHERE LOWER(e.distance_range) ILIKE '%' || LOWER(range) || '%'
                    )
                )

                -- Type de vélo
                AND (
                    array_length(_bike_types, 1) IS NULL OR
                    EXISTS (
                        SELECT 1
                        FROM unnest(_bike_types) AS bike
                        WHERE LOWER(e.bike_type) ILIKE '%' || LOWER(bike) || '%'
                    )
                )

                -- Classement
                AND (
                    array_length(_ranking, 1) IS NULL OR
                    EXISTS (
                        SELECT 1
                        FROM unnest(_ranking) AS rk
                        WHERE LOWER(e.type_event) ILIKE '%' || LOWER(rk) || '%'
                    )
                )

                -- Région
                AND (
                    array_length(_region, 1) IS NULL OR
                    EXISTS (
                        SELECT 1
                        FROM unnest(_region) AS reg
                        WHERE LOWER(e.region) ILIKE '%' || LOWER(reg) || '%'
                    )
                )

                -- Budget (si utilisé)
                -- AND (_budget IS NULL OR e.budget = _budget)
            )
        )
    ORDER BY e."dateEvent" ASC
    LIMIT _limit OFFSET _offset;
END;
$$;

ALTER FUNCTION "public"."get_filtered_events"("_term" "text", "_start_date" "text", "_end_date" "text", "_distance_range" "text"[], "_bike_types" "text"[], "_ranking" "text"[], "_region" "text"[], "_budget" "text", "_limit" integer, "_offset" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_filtered_events"("_term" "text" DEFAULT NULL::"text", "_start_date" "text" DEFAULT ''::"text", "_end_date" "text" DEFAULT ''::"text", "_distance_range" "text"[] DEFAULT ARRAY[]::"text"[], "_bike_types" "text"[] DEFAULT ARRAY[]::"text"[], "_ranking" "text"[] DEFAULT ARRAY[]::"text"[], "_region" "text"[] DEFAULT ARRAY[]::"text"[], "_budget" "text" DEFAULT NULL::"text", "_limit" integer DEFAULT 30, "_offset" integer DEFAULT 0, "_chip_type_event" "text" DEFAULT NULL::"text") RETURNS SETOF "public"."events"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT e.*
    FROM events e
    WHERE
        -- toujours imposé
        e.verifie = true
        AND
        (
            /* Branche 1 : recherche mot-clé => bypass des autres filtres */
            (
                COALESCE(NULLIF(TRIM(_term), ''), NULL) IS NOT NULL
                AND (
                    LOWER(e."nomEvent") LIKE '%' || LOWER(_term) || '%'
                    OR LOWER(e.organisateur) LIKE '%' || LOWER(_term) || '%'
                    OR LOWER(e."paysDepart") LIKE '%' || LOWER(_term) || '%'
                    OR LOWER(e."villeDepart") LIKE '%' || LOWER(_term) || '%'
                )
            )

            OR

            /* Branche 2 : pas de mot-clé => appliquer tous les filtres */
            (
                COALESCE(NULLIF(TRIM(_term), ''), NULL) IS NULL

                -- Dates
                --AND (COALESCE(NULLIF(_start_date, ''), NULL) IS NULL OR e."dateEvent" >= TO_DATE(_start_date, 'YYYY-MM-DD'))
               -- AND (COALESCE(NULLIF(_end_date, ''), NULL) IS NULL OR e."dateEvent" <= TO_DATE(_end_date, 'YYYY-MM-DD'))
                -- Début
AND (
  _start_date IS NULL OR trim(_start_date) = '' OR lower(trim(_start_date)) = 'null'
  OR e."dateEvent" >= to_date(_start_date, 'YYYY-MM-DD')
)

AND (
  _end_date IS NULL OR trim(_end_date) = '' OR lower(trim(_end_date)) = 'null'
  OR e."dateEvent" <= to_date(_end_date, 'YYYY-MM-DD')
)

                -- Distance
                AND (
                    array_length(_distance_range, 1) IS NULL OR
                    EXISTS (
                        SELECT 1
                        FROM unnest(_distance_range) AS range
                        WHERE LOWER(e.distance_range) ILIKE '%' || LOWER(range) || '%'
                    )
                )

                -- Type de vélo
                AND (
                    array_length(_bike_types, 1) IS NULL OR
                    EXISTS (
                        SELECT 1
                        FROM unnest(_bike_types) AS bike
                        WHERE LOWER(e.bike_type) ILIKE '%' || LOWER(bike) || '%'
                    )
                )

                -- Classement / Type event
                AND (
                    -- 1) Si le filtre complet _ranking est fourni (drawer) => il PRIME, on l'applique et on ignore le chip
                    (array_length(_ranking, 1) IS NOT NULL AND
                     EXISTS (
                       SELECT 1 FROM unnest(_ranking) AS rk
                       WHERE LOWER(e.type_event) ILIKE '%' || LOWER(rk) || '%'
                     )
                    )
                    OR
                    -- 2) Sinon (pas de _ranking), on applique le chip s'il est renseigné ; s'il est vide/null, on passe tout
                    (array_length(_ranking, 1) IS NULL AND
                     (
                       COALESCE(NULLIF(TRIM(_chip_type_event), ''), NULL) IS NULL
                       OR LOWER(e.type_event) ILIKE '%' || LOWER(_chip_type_event) || '%'
                     )
                    )
                )

                -- Région
                AND (
                    array_length(_region, 1) IS NULL OR
                    EXISTS (
                        SELECT 1
                        FROM unnest(_region) AS reg
                        WHERE LOWER(e.region) ILIKE '%' || LOWER(reg) || '%'
                    )
                )

                -- Budget (si utilisé)
                -- AND (_budget IS NULL OR e.budget = _budget)
            )
        )
    ORDER BY e."dateEvent" ASC
    LIMIT _limit OFFSET _offset;
END;
$$;

ALTER FUNCTION "public"."get_filtered_events"("_term" "text", "_start_date" "text", "_end_date" "text", "_distance_range" "text"[], "_bike_types" "text"[], "_ranking" "text"[], "_region" "text"[], "_budget" "text", "_limit" integer, "_offset" integer, "_chip_type_event" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_filtered_events"("_term" "text" DEFAULT NULL::"text", "_start_date" "text" DEFAULT ''::"text", "_end_date" "text" DEFAULT ''::"text", "_distance_range" "text"[] DEFAULT ARRAY[]::"text"[], "_bike_types" "text"[] DEFAULT ARRAY[]::"text"[], "_ranking" "text"[] DEFAULT ARRAY[]::"text"[], "_region" "text"[] DEFAULT ARRAY[]::"text"[], "_budget" "text" DEFAULT NULL::"text", "_limit" integer DEFAULT 30, "_offset" integer DEFAULT 0, "_chip_type_event" "text" DEFAULT NULL::"text", "_mixite" "text" DEFAULT NULL::"text") RETURNS SETOF "public"."events"
    LANGUAGE "plpgsql"
    AS $$BEGIN
    RETURN QUERY
    SELECT e.*
    FROM events e
    WHERE
        -- toujours imposé
        e.verifie = true

        -- NOUVEAU : Filtre de date de début toujours appliqué (événements futurs uniquement)
        -- Ce filtre s'applique maintenant AUSSI lors des recherches textuelles
        AND (
            _start_date IS NULL OR trim(_start_date) = '' OR lower(trim(_start_date)) = 'null'
            OR e."dateEvent" >= to_date(_start_date, 'YYYY-MM-DD')
        )

        AND
        (
            /* Branche 1 : recherche mot-clé => bypass des autres filtres (SAUF date de début) */
            (
                COALESCE(NULLIF(TRIM(_term), ''), NULL) IS NOT NULL
                AND (
                    LOWER(e."nomEvent") LIKE '%' || LOWER(_term) || '%'
                    OR LOWER(e.organisateur) LIKE '%' || LOWER(_term) || '%'
                    OR LOWER(e."paysDepart") LIKE '%' || LOWER(_term) || '%'
                    OR LOWER(e."villeDepart") LIKE '%' || LOWER(_term) || '%'
                )
            )

            OR

            /* Branche 2 : pas de mot-clé => appliquer tous les filtres */
            (
                COALESCE(NULLIF(TRIM(_term), ''), NULL) IS NULL

                -- Date de fin (uniquement dans branche 2)
                AND (
                    _end_date IS NULL OR trim(_end_date) = '' OR lower(trim(_end_date)) = 'null'
                    OR e."dateEvent" <= to_date(_end_date, 'YYYY-MM-DD')
                )

                -- Distance
                AND (
                    array_length(_distance_range, 1) IS NULL OR
                    EXISTS (
                        SELECT 1
                        FROM unnest(_distance_range) AS range
                        WHERE LOWER(e.distance_range) ILIKE '%' || LOWER(range) || '%'
                    )
                )

                -- Type de vélo
                AND (
                    array_length(_bike_types, 1) IS NULL OR
                    EXISTS (
                        SELECT 1
                        FROM unnest(_bike_types) AS bike
                        WHERE LOWER(e.bike_type) ILIKE '%' || LOWER(bike) || '%'
                    )
                )

                -- Classement / Type event
                AND (
                    -- 1) Si le filtre complet _ranking est fourni (drawer) => il PRIME, on l'applique et on ignore le chip
                    (array_length(_ranking, 1) IS NOT NULL AND
                     EXISTS (
                       SELECT 1 FROM unnest(_ranking) AS rk
                       WHERE LOWER(e.type_event) ILIKE '%' || LOWER(rk) || '%'
                     )
                    )
                    OR
                    -- 2) Sinon (pas de _ranking), on applique le chip s'il est renseigné ; s'il est vide/null, on passe tout
                    (array_length(_ranking, 1) IS NULL AND
                     (
                       COALESCE(NULLIF(TRIM(_chip_type_event), ''), NULL) IS NULL
                       OR LOWER(e.type_event) ILIKE '%' || LOWER(_chip_type_event) || '%'
                     )
                    )
                )

                -- Région
                AND (
                    array_length(_region, 1) IS NULL OR
                    EXISTS (
                        SELECT 1
                        FROM unnest(_region) AS reg
                        WHERE LOWER(e.region) ILIKE '%' || LOWER(reg) || '%'
                    )
                )

                -- Budget
                AND (
                    CASE lower(coalesce(trim(_budget), ''))
                        WHEN ''              THEN TRUE        -- pas de filtre
                        WHEN 'indifférent'   THEN TRUE        -- pas de filtre
                        WHEN 'indifferent'   THEN TRUE        -- variante sans accent
                        WHEN 'tous'          THEN TRUE
                        WHEN 'petit budget'  THEN lower(e.budget) = 'petit budget'
                        ELSE TRUE
                    END
                )

                -- Mixité
                AND (
                    CASE lower(coalesce(trim(_mixite), ''))
                        WHEN ''                 THEN TRUE
                        WHEN 'tous'             THEN TRUE
                        WHEN 'mixité choisie'   THEN e.mint = TRUE
                        WHEN 'mixite choisie'   THEN e.mint = TRUE     -- sans accent
                        WHEN 'mixte'            THEN e.mint = FALSE
                        ELSE TRUE
                    END
                )
            )
        )
    ORDER BY e."dateEvent" ASC
    LIMIT _limit OFFSET _offset;
END;$$;

ALTER FUNCTION "public"."get_filtered_events"("_term" "text", "_start_date" "text", "_end_date" "text", "_distance_range" "text"[], "_bike_types" "text"[], "_ranking" "text"[], "_region" "text"[], "_budget" "text", "_limit" integer, "_offset" integer, "_chip_type_event" "text", "_mixite" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_friends_who_liked_event"("current_u" "text", "event_id" bigint) RETURNS TABLE("friend_id" "uuid", "friend_name" "text", "friend_avatar_url" "text", "total_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.uid AS friend_id,
        u.name AS friend_name,
        u.avatar_url AS friend_avatar_url,
        COUNT(*) OVER () AS total_count
    FROM friendships f
    INNER JOIN favourite_events fe ON fe.user_id = f.friend_id
    INNER JOIN users u ON u.uid = f.friend_id
    WHERE f.user_id = current_u::uuid -- Récupérer les amis de l'utilisateur actuel
      AND f.status = 'accepted' -- Assurer que l'amitié est validée
      AND fe.event = event_id; -- Filtrer par l'événement
END;
$$;

ALTER FUNCTION "public"."get_friends_who_liked_event"("current_u" "text", "event_id" bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_next_favourite_event"("p_user_id" "uuid") RETURNS TABLE("event_id" bigint, "event_name" "text", "event_image" "text", "event_date" "date", "event_date2" "text", "days_until_event" integer, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH next_event AS (
    SELECT
      e.id::INTEGER AS event_id,
      e."nomEvent" AS event_name,
      e."image" AS event_image,
      e."dateEvent"::DATE AS event_date,
      e."dateEvent2" AS event_date2,
      (e."dateEvent"-CURRENT_DATE)::INT AS days_until_event,
      NULL::TEXT AS message
    FROM favourite_events fe
    JOIN events e ON fe.event = e.id
    WHERE fe.user_id = p_user_id
      AND e."dateEvent" >= CURRENT_DATE
    ORDER BY e."dateEvent" ASC
    LIMIT 1
  )
  SELECT * FROM next_event

  UNION ALL

  SELECT
    NULL::BIGINT AS event_id,
    NULL::TEXT AS event_name,
    NULL::TEXT AS event_image,
    NULL::DATE AS event_date,
    NULL::TEXT AS event_date2,
    NULL::INT AS days_until_event,
    'Aucune aventure favorite à venir' AS message
  WHERE NOT EXISTS (SELECT 1 FROM next_event);

END;
$$;

ALTER FUNCTION "public"."get_next_favourite_event"("p_user_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_organizer_details"("organizer_id" integer) RETURNS TABLE("nom_orga" "text", "image" "text", "total_abo" integer, "past_events" "jsonb", "upcoming_events" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH 
    -- Récupérer les informations de l'organisateur
    organizer_info AS (
        SELECT 
            o.id AS orga_id,
            o.nom_orga AS nom,
            o.image AS image
        FROM organisateurs o
        WHERE o.id = organizer_id
    ),

    -- Récupérer le nombre d'abonnés à l'organisateur
    follower_count AS (
        SELECT 
            fo.orga,
            COUNT(*)::INT AS total_abo
        FROM favourite_organisateurs fo
        WHERE fo.orga = organizer_id
        GROUP BY fo.orga
    ),

    -- Récupérer les événements passés
    events_past AS (
        SELECT 
            e.organisateur,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'event_id',e.id,
                    'event_name', e."nomEvent",
                    'event_image', e."image",
                    'event_date', e."dateEvent2",--'event_date', TO_CHAR(e."dateEvent", 'DD/MM/YY'), --On remplace la date par le format dd/MM/yy 
                    'ville', e."villeDepart",
                    'pays', e."paysDepart",
                    'distance', e.distance,
                    'bike_type', e.bike_type
                )
                ORDER BY e."dateEvent" DESC -- Tri des événements passés : du plus récent au plus ancien
            ) AS past_events
        FROM events e
        INNER JOIN organisateurs o ON e.organisateur = o.nom_orga -- Jointure via le nom de l'orga
        WHERE o.id = organizer_id
        AND e."dateEvent" < CURRENT_DATE
        AND e.verifie = TRUE -- ✅ Filtre ajouté
        GROUP BY e.organisateur
    ),

    -- Récupérer les événements à venir avec le nom de l'organisateur
    events_upcoming AS (
        SELECT 
            e.organisateur,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'event_id',e.id,
                    'event_name', e."nomEvent",
                    'event_image', e."image",                    
                    'event_date', e."dateEvent2",--'event_date', TO_CHAR(e."dateEvent", 'DD/MM/YY'),
                    'ville', e."villeDepart",
                    'pays', e."paysDepart",
                    'distance', e.distance,
                    'bike_type', e.bike_type
                  )
                ORDER BY e."dateEvent" ASC -- Tri des événements à venir : du plus proche au plus lointain
            ) AS upcoming_events
        FROM events e
        INNER JOIN organisateurs o ON e.organisateur = o.nom_orga -- Jointure via le nom de l'orga
        WHERE o.id = organizer_id
        AND e."dateEvent" >= CURRENT_DATE
        AND e.verifie = TRUE -- ✅ Filtre ajouté
        GROUP BY e.organisateur
    )

    -- Combiner toutes les informations
    SELECT 
        oi.nom,
        oi.image,
        COALESCE(fc.total_abo, 0) AS total_abo,
        COALESCE(ep.past_events, '[]'::JSONB) AS past_events,
        COALESCE(eu.upcoming_events, '[]'::JSONB) AS upcoming_events
    FROM organizer_info oi
    LEFT JOIN follower_count fc ON oi.orga_id = fc.orga
    LEFT JOIN events_past ep ON oi.nom = ep.organisateur
    LEFT JOIN events_upcoming eu ON oi.nom = eu.organisateur;
END;
$$;

ALTER FUNCTION "public"."get_organizer_details"("organizer_id" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_popular_events"() RETURNS SETOF "public"."events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$  -- ✅ Retourne uniquement les colonnes de "events"
BEGIN
    RETURN QUERY
    WITH popular_events_cte AS (
        SELECT 
            e.*  -- ✅ Retourne exactement les colonnes de "events"
        FROM events e
        LEFT JOIN favourite_events f ON e.id = f.event
        WHERE e."dateEvent" >= CURRENT_DATE
        AND e.verifie = TRUE
        --WHERE COALESCE(e.categorie, '') = ''  -- Exclure les events déjà catégorisés
        --AND e.dateEvent >= CURRENT_DATE       -- Exclure les événements passés
        GROUP BY e.id  -- ✅ Regroupement uniquement sur l'ID
        ORDER BY COUNT(f.event) DESC  -- ✅ Trie par popularité (likes)
        LIMIT 5
    )
    SELECT * FROM popular_events_cte;
END;
$$;

ALTER FUNCTION "public"."get_popular_events"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_popular_events"("p_limit" integer DEFAULT 10) RETURNS TABLE("event_id" integer, "fav_count" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
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

ALTER FUNCTION "public"."get_popular_events"("p_limit" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_user_favourite_events"("p_user_id" "uuid") RETURNS TABLE("event_id" bigint, "event_name" "text", "event_image" "text", "event_date" "date", "ville" "text", "pays" "text", "distance" numeric, "bike_type" "text", "is_upcoming" boolean, "days_until_event" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS event_id,
    e."nomEvent" AS event_name,
    e."image" AS event_image,
    e."dateEvent"::DATE AS event_date,
    e."villeDepart" AS ville,
    e."paysDepart" AS pays,
    e.distance,
    e.bike_type,
    (e."dateEvent" >= CURRENT_DATE) AS is_upcoming,
    CASE 
      WHEN e."dateEvent" >= CURRENT_DATE THEN 
        DATE_PART('day', AGE(e."dateEvent", CURRENT_DATE))::INT
      ELSE 
        NULL
    END AS days_until_event
  FROM favourite_events fe
  JOIN events e ON fe.event = e.id
  WHERE fe.user_id = p_user_id
  ORDER BY e."dateEvent" ASC;
END;
$$;

ALTER FUNCTION "public"."get_user_favourite_events"("p_user_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_user_relationship_data"("c_user" "uuid", "profile_user" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
declare
    status_result text;
    following_count int;
    followers_count int;
    pending_requests_count int;
begin
    -- Récupérer le statut de la relation
    select f.status
    into status_result
    from friendships f
    where f.follower_id = c_user
      and f.followed_id = profile_user;

    -- Récupérer le nombre d'abonnements de profile_user
    select count(*)
    into following_count
    from friendships
    where follower_id = profile_user
    and status = 'accepted';

    -- Récupérer le nombre d'abonnés de profile_user
    select count(*)
    into followers_count
    from friendships
    where followed_id = profile_user
    and status = 'accepted';

    -- Récupérer le nombre de demandes en attente pour le current_user
    select COUNT(*)
    into pending_requests_count
    from friendships
    where followed_id = c_user AND status = 'pending';

    -- Retourner les données sous forme JSON
    return jsonb_build_object(
        'status', status_result, -- Statut de la relation
        'following_count', following_count,      -- Nombre d'abonnements
        'followers_count', followers_count,       -- Nombre d'abonnés
        'pending_requests_count', pending_requests_count -- Nombre de demandes en attente
    );
end;
$$;

ALTER FUNCTION "public"."get_user_relationship_data"("c_user" "uuid", "profile_user" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."has_unread_notifications"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM notifications
    WHERE user_id = _user_id AND is_read = FALSE
  );
END;
$$;

ALTER FUNCTION "public"."has_unread_notifications"("_user_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."notify_dot_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Vérifie si la catégorie est passée à 'Dot'
  IF NEW.catégorie = 'Dot' THEN
   -- Insert pour chaque user actif
    INSERT INTO notifications (title, body, user_id, redirect, redirect_id)
    SELECT
      '🏁 Top départ !',
      'Suis la ' || NEW."nomEvent" || ' en direct 👀',
      u.uid,
      'event',
      NEW.id
    FROM users u
    WHERE u.fcm_token IS NOT NULL;
    --  AND (u.push_notifications = true OR u.push_notifications IS NULL); -- optionnel
    
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."notify_dot_event"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."notify_friend_accepted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  accepter_name TEXT;
  notif_title TEXT := '🎉 Demande d’ami acceptée';
  notif_body  TEXT;
BEGIN
  -- REMPLACER users.uid si nécessaire (ici on suppose uid)
  SELECT COALESCE(u.name, 'Quelqu''un') INTO accepter_name
  FROM public.users u
  WHERE u.uid = NEW.followed_id
  LIMIT 1;

  notif_body := accepter_name || ' a accepté ta demande 🚴';

  INSERT INTO public.notifications (user_id, title, body, redirect)
  VALUES (
    NEW.follower_id,
    notif_title,
    notif_body,
    'profile'
  );

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."notify_friend_accepted"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."notify_friend_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  sender_name TEXT;
  notif_title TEXT := '👋 Nouvelle demande d’ami';
  notif_body TEXT;
BEGIN
  -- Récupérer le nom du follower (expéditeur de la demande)
  SELECT name INTO sender_name
  FROM users
  WHERE uid = NEW.follower_id;

  -- Construire le message
  notif_body := sender_name || ' veut te suivre 🚴';

  -- Créer la notification pour le destinataire (followed_id)
  INSERT INTO notifications (user_id, title, body, redirect)
  VALUES (
    NEW.followed_id,
    notif_title,
    notif_body,
    'profile'
      );

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."notify_friend_request"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."notify_new_event_from_favourite_org"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_title TEXT := '🔔 Nouvel évènement';
  v_body  TEXT;
  v_orga_id BIGINT;
BEGIN
  -- Filtre INSERT ou UPDATE
  IF TG_OP = 'INSERT' THEN
    IF NOT NEW.verifie OR NEW.notified THEN
      RETURN NEW;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.verifie OR NOT NEW.verifie OR NEW.notified THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Étape A : ID organisateur
  SELECT id INTO STRICT v_orga_id
  FROM organisateurs
  WHERE nom_orga = NEW.organisateur;

  -- Étape B : Texte notif
  v_body := format('%s lance %s', NEW.organisateur, NEW."nomEvent");

  -- Étape C : Insert notifs fans
  INSERT INTO notifications (user_id, title, body, redirect, redirect_id)
  SELECT
    fo.user_id,
    v_title,
    v_body,
    'event',
    NEW.id
  FROM favourite_organisateurs fo
  WHERE fo.orga = v_orga_id;

  -- Étape D : Marque comme notifié
  UPDATE events SET notified = TRUE WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."notify_new_event_from_favourite_org"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."refresh_popular_events"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW popular_events;
  RETURN NULL;
END;
$$;

ALTER FUNCTION "public"."refresh_popular_events"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."save_event_proposal_review"("p_event_id" bigint, "p_event" "jsonb", "p_routes" "jsonb", "p_status" "text" DEFAULT NULL::"text", "p_reason" "text" DEFAULT NULL::"text", "p_reviewer" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  route jsonb;
  route_count integer;
begin
  if p_status is not null and p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Invalid proposal review status';
  end if;
  if jsonb_typeof(p_routes) <> 'array' or jsonb_array_length(p_routes) = 0 then
    raise exception 'At least one route is required';
  end if;

  route_count := jsonb_array_length(p_routes);

  update public.events
  set "nomEvent" = p_event->>'name',
      slug = p_event->>'slug',
      "dateEvent" = nullif(p_event->>'startDate', '')::date,
      "dateFin" = nullif(p_event->>'endDate', '')::date,
      "villeDepart" = p_event->>'city',
      "paysDepart" = nullif(p_event->>'country', ''),
      description = p_event->>'description',
      "URL" = nullif(p_event->>'url', ''),
      image = nullif(p_event->>'image', ''),
      organisateur = p_event->>'organizer',
      mint = coalesce((p_event->>'mint')::boolean, false),
      type_event = p_event->>'eventType',
      bike_type = p_event->>'bikeType',
      distance = p_event->>'distance',
      distance_range = p_event->>'distanceRange',
      distance_range_filter = p_event->>'distanceFilter',
      "nb_sousEvents" = route_count,
      verifie = case when p_status = 'approved' then true when p_status = 'rejected' then false else verifie end
  where id = p_event_id;

  if not found then raise exception 'Event not found'; end if;

  delete from public.sous_events where event_id = p_event_id;
  for route in select value from jsonb_array_elements(p_routes)
  loop
    insert into public.sous_events (
      event_id, event_name, nom, "bikeType", distance, elevation, prix, trace_fixe, "typeEvent", delai
    ) values (
      p_event_id,
      p_event->>'name',
      nullif(route->>'name', ''),
      route->>'bikeType',
      (route->>'distance')::smallint,
      nullif(route->>'elevation', '')::bigint,
      (route->>'price')::smallint,
      coalesce((route->>'fixedTrack')::boolean, false),
      route->>'eventType',
      nullif(route->>'delay', '')
    );
  end loop;

  if p_status is not null then
    update public.event_submission_contacts
    set review_status = p_status,
        review_reason = case when p_status = 'rejected' then nullif(btrim(p_reason), '') else null end,
        reviewed_at = case when p_status = 'pending' then null else now() end,
        reviewed_by = case when p_status = 'pending' then null else p_reviewer end
    where event_id = p_event_id;
  end if;
end;
$$;

ALTER FUNCTION "public"."save_event_proposal_review"("p_event_id" bigint, "p_event" "jsonb", "p_routes" "jsonb", "p_status" "text", "p_reason" "text", "p_reviewer" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."set_orga_image"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.image := 'https://api.dicebear.com/9.x/initials/png?seed=' || NEW.nom_orga;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."set_orga_image"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."sync_user_public"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.user_public (uid, name, surname, avatar_url, updated_at)
  values (new.uid, new.name, new.surname, new.avatar_url, now())
  on conflict (uid)
  do update set
    name = excluded.name,
    surname = excluded.surname,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

ALTER FUNCTION "public"."sync_user_public"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."upcomi_event_slugify"("value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  select nullif(
    regexp_replace(
      regexp_replace(
        lower(extensions.unaccent(coalesce(value, ''))),
        '[^a-z0-9]+',
        '-',
        'g'
      ),
      '(^-|-$)',
      '',
      'g'
    ),
    ''
  );
$_$;

ALTER FUNCTION "public"."upcomi_event_slugify"("value" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_nb_events_for_organisateur"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE organisateurs
  SET nb_events = (
    SELECT COUNT(*) FROM events WHERE organisateur = NEW.organisateur AND verifie = TRUE
  )
  WHERE nom_orga = NEW.organisateur;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_nb_events_for_organisateur"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."update_user_fcm"("p_fcm" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
    -- Set a secure search path
    SET search_path = public, auth;
    
    UPDATE public.users
    SET 
        fcm_token = p_fcm,
        fcm_last_date = now()
    WHERE uid = auth.uid();

    RETURN FOUND; 
END;
$$;

ALTER FUNCTION "public"."update_user_fcm"("p_fcm" "text") OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."action_tracking" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "action_type" "text",
    "related_event_id" bigint,
    "source_page" "text"
);

ALTER TABLE "public"."action_tracking" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."admin_users" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."app_features" (
    "key" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."app_features" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."app_state" (
    "id" bigint NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "need_refresh" boolean DEFAULT false
);

ALTER TABLE "public"."app_state" OWNER TO "postgres";

ALTER TABLE "public"."app_state" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."app_stats_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."collection_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "collection_id" "uuid" NOT NULL,
    "event_id" integer NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
);

ALTER TABLE "public"."collection_events" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."collections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "order" integer DEFAULT 0 NOT NULL,
    "is_auto" boolean DEFAULT false NOT NULL,
    "auto_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."collections" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."deletion_requests" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "has_subscription" boolean DEFAULT false,
    "revenuecat_id" "text",
    "error_message" "text",
    "completed_at" timestamp with time zone
);

ALTER TABLE "public"."deletion_requests" OWNER TO "postgres";

ALTER TABLE "public"."deletion_requests" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."deletion_requests_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."event_submission_contacts" (
    "event_id" bigint NOT NULL,
    "contact_name" "text",
    "contact_email" "text",
    "departure_address" "text",
    "departure_postal_code" "text",
    "departure_city" "text" NOT NULL,
    "departure_country" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "review_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "review_reason" "text",
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    CONSTRAINT "event_submission_contacts_review_status_check" CHECK (("review_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);

ALTER TABLE "public"."event_submission_contacts" OWNER TO "postgres";

ALTER TABLE "public"."action_tracking" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."event_tracking_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."favourite_events" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event" bigint NOT NULL,
    "participates" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."favourite_events" OWNER TO "postgres";

ALTER TABLE "public"."favourite_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."favourite_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."favourite_organisateurs" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "orga" bigint NOT NULL,
    "push_notifications" boolean DEFAULT true,
    "newsletter" boolean
);

ALTER TABLE "public"."favourite_organisateurs" OWNER TO "postgres";

ALTER TABLE "public"."favourite_organisateurs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."favourite_organisateurs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reporter_id" "uuid",
    "type" "text",
    "message" "text"
);

ALTER TABLE "public"."feedback" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."feedback_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "kind" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "contact_name" "text",
    "contact_email" "text",
    "page_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feedback_entries_kind_check" CHECK (("kind" = ANY (ARRAY['idea'::"text", 'bug'::"text", 'feedback'::"text"]))),
    CONSTRAINT "feedback_entries_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'reviewing'::"text", 'closed'::"text"])))
);

ALTER TABLE "public"."feedback_entries" OWNER TO "postgres";

ALTER TABLE "public"."feedback" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."feedback_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."friendships" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "follower_id" "uuid" NOT NULL,
    "followed_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text"
);

ALTER TABLE "public"."friendships" OWNER TO "postgres";

COMMENT ON COLUMN "public"."friendships"."follower_id" IS 'Celui qui s''abonne';

COMMENT ON COLUMN "public"."friendships"."followed_id" IS 'Celui qui est suivi';

ALTER TABLE "public"."friendships" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."friendships_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."inscription_notif" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "event" bigint,
    "notification_enabled" boolean DEFAULT true
);

ALTER TABLE "public"."inscription_notif" OWNER TO "postgres";

COMMENT ON TABLE "public"."inscription_notif" IS 'Liste de tous les utilisateurs qui souhaitent être notifiés de l''ouverture des inscriptions';

ALTER TABLE "public"."inscription_notif" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."inscription_notif_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."next_adventures" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_id" bigint NOT NULL,
    "is_current" boolean DEFAULT true
);

ALTER TABLE "public"."next_adventures" OWNER TO "postgres";

ALTER TABLE "public"."next_adventures" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."next_adventures_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "big_image" "text",
    "redirect" "text",
    "redirect_id" bigint
);

ALTER TABLE "public"."notifications" OWNER TO "postgres";

ALTER TABLE "public"."notifications" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."organisateurs" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nom_orga" "text",
    "nb_events" smallint,
    "nb_abo" smallint,
    "image" "text"
);

ALTER TABLE "public"."organisateurs" OWNER TO "postgres";

ALTER TABLE "public"."organisateurs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."organisateurs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."prix" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "prix_abo" double precision
);

ALTER TABLE "public"."prix" OWNER TO "postgres";

ALTER TABLE "public"."prix" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."prix_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reported_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    CONSTRAINT "cannot_report_self" CHECK (("reporter_id" <> "reported_id"))
);

ALTER TABLE "public"."reports" OWNER TO "postgres";

COMMENT ON TABLE "public"."reports" IS 'Signalements de profils utilisateurs';

COMMENT ON COLUMN "public"."reports"."reporter_id" IS 'Utilisateur qui effectue le signalement';

COMMENT ON COLUMN "public"."reports"."reported_id" IS 'Utilisateur signalé';

COMMENT ON COLUMN "public"."reports"."status" IS 'Statut du signalement: pending, reviewed, dismissed, actioned';

ALTER TABLE "public"."reports" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."reports_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."ressources" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "categorie" "text" NOT NULL,
    "nom" "text",
    "description" "text",
    "lien" "text",
    "tags" "text"[],
    "text_color" "text",
    "fill_color" "text"
);

ALTER TABLE "public"."ressources" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."ressources_categories" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nom_ctg" "text" NOT NULL,
    "url" "text",
    "launched" boolean DEFAULT false,
    "image" "text",
    "position" bigint,
    "sous_texte" "text",
    "sous_texte_on" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."ressources_categories" OWNER TO "postgres";

ALTER TABLE "public"."ressources_categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ressources_categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."ressources" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ressources_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."social_ride" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nom" "text" NOT NULL,
    "lieu_rdv" "text",
    "ville" "text",
    "jour" "text",
    "mixité choisie" boolean,
    "niveau" "text",
    "lien1" "text",
    "lien2" "text",
    "lien3" "text",
    "desc_pampam" "text",
    "mixte" "text",
    "bike_type" "text",
    "logo" "text"
);

ALTER TABLE "public"."social_ride" OWNER TO "postgres";

ALTER TABLE "public"."social_ride" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."social_ride_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."sous_events" (
    "sousEventID" bigint NOT NULL,
    "nom" "text",
    "bikeType" "text",
    "distance" smallint,
    "elevation" bigint,
    "prix" smallint,
    "trace_fixe" boolean,
    "typeEvent" "text",
    "event_id" bigint,
    "event_name" "text",
    "delai" "text"
);

ALTER TABLE "public"."sous_events" OWNER TO "postgres";

COMMENT ON COLUMN "public"."sous_events"."typeEvent" IS 'Classement (oui / non), Aventure, Bikepacking, Ultra ...';

COMMENT ON COLUMN "public"."sous_events"."delai" IS 'Délai du parcours à réaliser';

ALTER TABLE "public"."sous_events" ALTER COLUMN "sousEventID" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sous_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."user_public" (
    "uid" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "surname" "text",
    "avatar_url" "text"
);

ALTER TABLE "public"."user_public" OWNER TO "postgres";

COMMENT ON TABLE "public"."user_public" IS 'Table qui affiche les infos aux autres users';

CREATE TABLE IF NOT EXISTS "public"."users" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "name" "text",
    "uid" "uuid" NOT NULL,
    "avatar_url" "text" DEFAULT ''::"text",
    "pref2" "text",
    "pref3" "text",
    "surname" "text",
    "pref1" "text"[],
    "fcm_token" "text",
    "fcm_last_date" timestamp with time zone,
    "premium" boolean DEFAULT false NOT NULL,
    "gender" "text",
    "ville" "text",
    "selection_count" bigint DEFAULT '0'::bigint,
    "subscription_expires_at" timestamp with time zone,
    "product_id" "text",
    "store" "text",
    "cancel_reason" "text",
    "expiration_reason" "text",
    "billing_issue" boolean DEFAULT false,
    "grace_period_expires_at" timestamp with time zone,
    "subscription_paused" boolean DEFAULT false,
    "auto_resume_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "revenuecat_id" "text"
);

ALTER TABLE "public"."users" OWNER TO "postgres";

COMMENT ON COLUMN "public"."users"."selection_count" IS 'Nb d''events consultés sur la map pour afficher le paywall';

ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_key" UNIQUE ("user_id");

ALTER TABLE ONLY "public"."app_features"
    ADD CONSTRAINT "app_features_pkey" PRIMARY KEY ("key");

ALTER TABLE ONLY "public"."app_state"
    ADD CONSTRAINT "app_stats_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."collection_events"
    ADD CONSTRAINT "collection_events_collection_id_event_id_key" UNIQUE ("collection_id", "event_id");

ALTER TABLE ONLY "public"."collection_events"
    ADD CONSTRAINT "collection_events_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."deletion_requests"
    ADD CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."event_submission_contacts"
    ADD CONSTRAINT "event_submission_contacts_pkey" PRIMARY KEY ("event_id");

ALTER TABLE ONLY "public"."action_tracking"
    ADD CONSTRAINT "event_tracking_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."favourite_events"
    ADD CONSTRAINT "favourite_events_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."favourite_organisateurs"
    ADD CONSTRAINT "favourite_organisateurs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."feedback_entries"
    ADD CONSTRAINT "feedback_entries_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."inscription_notif"
    ADD CONSTRAINT "inscription_notif_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."next_adventures"
    ADD CONSTRAINT "next_adventures_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."organisateurs"
    ADD CONSTRAINT "organisateurs_id_key" UNIQUE ("id");

ALTER TABLE ONLY "public"."organisateurs"
    ADD CONSTRAINT "organisateurs_nom_orga_key" UNIQUE ("nom_orga");

ALTER TABLE ONLY "public"."organisateurs"
    ADD CONSTRAINT "organisateurs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."prix"
    ADD CONSTRAINT "prix_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."ressources_categories"
    ADD CONSTRAINT "ressources_categories_nom_ctg_key" UNIQUE ("nom_ctg");

ALTER TABLE ONLY "public"."ressources_categories"
    ADD CONSTRAINT "ressources_categories_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."ressources"
    ADD CONSTRAINT "ressources_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."social_ride"
    ADD CONSTRAINT "social_ride_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."sous_events"
    ADD CONSTRAINT "sous_events_pkey" PRIMARY KEY ("sousEventID");

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "unique_report" UNIQUE ("reporter_id", "reported_id");

ALTER TABLE ONLY "public"."user_public"
    ADD CONSTRAINT "user_public_pkey" PRIMARY KEY ("uid");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("uid");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_uid_key" UNIQUE ("uid");

CREATE INDEX "event_submission_contacts_review_queue_idx" ON "public"."event_submission_contacts" USING "btree" ("review_status", "submitted_at" DESC);

CREATE INDEX "events_public_search_bike_type_trgm_idx" ON "public"."events" USING "gin" ("bike_type" "extensions"."gin_trgm_ops") WHERE (("verifie" = true) AND ("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL) AND ("dateEvent" IS NOT NULL) AND ("bike_type" IS NOT NULL));

CREATE INDEX "events_public_search_budget_idx" ON "public"."events" USING "btree" ("budget", "dateEvent") WHERE (("verifie" = true) AND ("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL) AND ("dateEvent" IS NOT NULL) AND ("budget" IS NOT NULL));

CREATE INDEX "events_public_search_date_fin_idx" ON "public"."events" USING "btree" ("dateFin", "dateEvent") WHERE (("verifie" = true) AND ("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL) AND ("dateEvent" IS NOT NULL));

CREATE INDEX "events_public_search_date_idx" ON "public"."events" USING "btree" ("dateEvent", "dateFin") WHERE (("verifie" = true) AND ("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL) AND ("dateEvent" IS NOT NULL));

CREATE INDEX "events_public_search_distance_trgm_idx" ON "public"."events" USING "gin" ("distance_range_filter" "extensions"."gin_trgm_ops") WHERE (("verifie" = true) AND ("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL) AND ("dateEvent" IS NOT NULL) AND ("distance_range_filter" IS NOT NULL));

CREATE INDEX "events_public_search_fts_idx" ON "public"."events" USING "gin" ("search_fts") WHERE (("verifie" = true) AND ("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL) AND ("dateEvent" IS NOT NULL));

CREATE INDEX "events_public_search_mint_idx" ON "public"."events" USING "btree" ("dateEvent") WHERE (("verifie" = true) AND ("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL) AND ("dateEvent" IS NOT NULL) AND ("mint" = true));

CREATE INDEX "events_public_search_region_idx" ON "public"."events" USING "btree" ("region", "dateEvent") WHERE (("verifie" = true) AND ("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL) AND ("dateEvent" IS NOT NULL) AND ("region" IS NOT NULL));

CREATE INDEX "events_public_search_type_event_trgm_idx" ON "public"."events" USING "gin" ("type_event" "extensions"."gin_trgm_ops") WHERE (("verifie" = true) AND ("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL) AND ("dateEvent" IS NOT NULL) AND ("type_event" IS NOT NULL));

CREATE UNIQUE INDEX "events_slug_lower_unique_idx" ON "public"."events" USING "btree" ("lower"("slug"));

CREATE INDEX "feedback_entries_created_at_idx" ON "public"."feedback_entries" USING "btree" ("created_at" DESC);

CREATE INDEX "feedback_entries_status_idx" ON "public"."feedback_entries" USING "btree" ("status");

CREATE INDEX "idx_deletion_requests_status" ON "public"."deletion_requests" USING "btree" ("status") WHERE ("status" = 'pending'::"text");

CREATE INDEX "reports_reported_id_idx" ON "public"."reports" USING "btree" ("reported_id");

CREATE INDEX "reports_reporter_id_idx" ON "public"."reports" USING "btree" ("reporter_id");

CREATE INDEX "reports_status_idx" ON "public"."reports" USING "btree" ("status");

CREATE OR REPLACE TRIGGER "before_insert_orga" BEFORE INSERT ON "public"."organisateurs" FOR EACH ROW EXECUTE FUNCTION "public"."set_orga_image"();

CREATE OR REPLACE TRIGGER "before_insert_update_orga" BEFORE INSERT OR UPDATE ON "public"."organisateurs" FOR EACH ROW EXECUTE FUNCTION "public"."set_orga_image"();

CREATE OR REPLACE TRIGGER "send-push-notification" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://hgsfjkgvqcougfamkncj.supabase.co/functions/v1/push', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnc2Zqa2d2cWNvdWdmYW1rbmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2MzgzNDMsImV4cCI6MjA0ODIxNDM0M30.27NGxgkuhk00PtQtFvFDtf25UYb43MCdCyEXYpLZ6dY"}', '{}', '5000');

CREATE OR REPLACE TRIGGER "set_collections_updated_at" BEFORE UPDATE ON "public"."collections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "set_feedback_entries_updated_at" BEFORE UPDATE ON "public"."feedback_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "trg_notify_friend_accepted" AFTER UPDATE ON "public"."friendships" FOR EACH ROW WHEN ((("new"."status" = 'accepted'::"text") AND ("old"."status" IS DISTINCT FROM 'accepted'::"text"))) EXECUTE FUNCTION "public"."notify_friend_accepted"();

CREATE OR REPLACE TRIGGER "trg_notify_friend_request" AFTER INSERT ON "public"."friendships" FOR EACH ROW WHEN (("new"."status" = 'pending'::"text")) EXECUTE FUNCTION "public"."notify_friend_request"();

CREATE OR REPLACE TRIGGER "trg_notify_new_event_fav_org" AFTER INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_event_from_favourite_org"();

CREATE OR REPLACE TRIGGER "trg_notify_new_event_fav_org_update" AFTER UPDATE OF "verifie" ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_event_from_favourite_org"();

CREATE OR REPLACE TRIGGER "trg_sync_user_public" AFTER INSERT OR UPDATE OF "name", "surname", "avatar_url" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_public"();

CREATE OR REPLACE TRIGGER "trigger-process-deletion" AFTER INSERT ON "public"."deletion_requests" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://hgsfjkgvqcougfamkncj.supabase.co/functions/v1/process-deletion', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnc2Zqa2d2cWNvdWdmYW1rbmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjYzODM0MywiZXhwIjoyMDQ4MjE0MzQzfQ.UjJWwoT55f_MXvznDC9m0iYJfegeZOwKAkwjndnhPw0"}', '{}', '5000');

CREATE OR REPLACE TRIGGER "trigger_notify_dot_event" AFTER UPDATE OF "catégorie" ON "public"."events" FOR EACH ROW WHEN (("old"."catégorie" IS DISTINCT FROM "new"."catégorie")) EXECUTE FUNCTION "public"."notify_dot_event"();

CREATE OR REPLACE TRIGGER "trigger_update_nb_events_after_delete" AFTER DELETE ON "public"."events" FOR EACH ROW WHEN (("old"."organisateur" IS NOT NULL)) EXECUTE FUNCTION "public"."update_nb_events_for_organisateur"();

CREATE OR REPLACE TRIGGER "trigger_update_nb_events_after_insert" AFTER INSERT ON "public"."events" FOR EACH ROW WHEN (("new"."organisateur" IS NOT NULL)) EXECUTE FUNCTION "public"."update_nb_events_for_organisateur"();

CREATE OR REPLACE TRIGGER "trigger_update_nb_events_after_update" AFTER UPDATE OF "organisateur" ON "public"."events" FOR EACH ROW WHEN (("new"."organisateur" IS DISTINCT FROM "old"."organisateur")) EXECUTE FUNCTION "public"."update_nb_events_for_organisateur"();

CREATE OR REPLACE TRIGGER "trigger_update_nb_events_verifie" AFTER UPDATE OF "verifie" ON "public"."events" FOR EACH ROW WHEN (("new"."organisateur" IS NOT NULL)) EXECUTE FUNCTION "public"."update_nb_events_for_organisateur"();

ALTER TABLE ONLY "public"."action_tracking"
    ADD CONSTRAINT "action_tracking_related_event_id_fkey" FOREIGN KEY ("related_event_id") REFERENCES "public"."events"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."collection_events"
    ADD CONSTRAINT "collection_events_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."collection_events"
    ADD CONSTRAINT "collection_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_submission_contacts"
    ADD CONSTRAINT "event_submission_contacts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_submission_contacts"
    ADD CONSTRAINT "event_submission_contacts_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."action_tracking"
    ADD CONSTRAINT "event_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_organisateur_fkey" FOREIGN KEY ("organisateur") REFERENCES "public"."organisateurs"("nom_orga") ON UPDATE CASCADE;

ALTER TABLE ONLY "public"."favourite_events"
    ADD CONSTRAINT "favourite_events_event_fkey" FOREIGN KEY ("event") REFERENCES "public"."events"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."favourite_events"
    ADD CONSTRAINT "favourite_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."favourite_organisateurs"
    ADD CONSTRAINT "favourite_organisateurs_orga_fkey" FOREIGN KEY ("orga") REFERENCES "public"."organisateurs"("id");

ALTER TABLE ONLY "public"."favourite_organisateurs"
    ADD CONSTRAINT "favourite_organisateurs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."feedback_entries"
    ADD CONSTRAINT "feedback_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."user_public"("uid");

ALTER TABLE ONLY "public"."deletion_requests"
    ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_followed_id_fkey" FOREIGN KEY ("followed_id") REFERENCES "public"."users"("uid") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("uid") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."inscription_notif"
    ADD CONSTRAINT "inscription_notif_event_fkey" FOREIGN KEY ("event") REFERENCES "public"."events"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."inscription_notif"
    ADD CONSTRAINT "inscription_notif_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."next_adventures"
    ADD CONSTRAINT "next_adventures_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."next_adventures"
    ADD CONSTRAINT "next_adventures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reported_id_fkey" FOREIGN KEY ("reported_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("uid") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."ressources"
    ADD CONSTRAINT "ressources_categorie_fkey" FOREIGN KEY ("categorie") REFERENCES "public"."ressources_categories"("nom_ctg") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."sous_events"
    ADD CONSTRAINT "sous_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_uid_fkey" FOREIGN KEY ("uid") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;

CREATE POLICY "Collection events are viewable by everyone" ON "public"."collection_events" FOR SELECT USING (true);

CREATE POLICY "Collections are viewable by everyone" ON "public"."collections" FOR SELECT USING (true);

CREATE POLICY "Disable delete to all users" ON "public"."action_tracking" AS RESTRICTIVE FOR DELETE USING (false);

CREATE POLICY "Disable delete to all users" ON "public"."app_state" AS RESTRICTIVE FOR DELETE USING (false);

CREATE POLICY "Disable delete to all users" ON "public"."notifications" AS RESTRICTIVE FOR DELETE USING (false);

CREATE POLICY "Disable delete to all users" ON "public"."organisateurs" AS RESTRICTIVE FOR DELETE USING (false);

CREATE POLICY "Disable delete to all users" ON "public"."prix" FOR DELETE USING (false);

CREATE POLICY "Disable delete to all users" ON "public"."ressources" AS RESTRICTIVE FOR DELETE USING (false);

CREATE POLICY "Disable delete to all users" ON "public"."ressources_categories" AS RESTRICTIVE FOR DELETE USING (false);

CREATE POLICY "Disable delete to all users" ON "public"."social_ride" AS RESTRICTIVE FOR DELETE USING (false);

CREATE POLICY "Disable delete to all users" ON "public"."sous_events" AS RESTRICTIVE FOR DELETE USING (false);

CREATE POLICY "Disable insert notifications to all users" ON "public"."notifications" AS RESTRICTIVE FOR INSERT WITH CHECK (false);

CREATE POLICY "Disable insert to all users" ON "public"."app_state" AS RESTRICTIVE FOR INSERT WITH CHECK (false);

CREATE POLICY "Disable insert to all users" ON "public"."organisateurs" AS RESTRICTIVE FOR INSERT WITH CHECK (false);

CREATE POLICY "Disable insert to all users" ON "public"."prix" AS RESTRICTIVE FOR INSERT WITH CHECK (false);

CREATE POLICY "Disable insert to all users" ON "public"."ressources" AS RESTRICTIVE FOR INSERT WITH CHECK (false);

CREATE POLICY "Disable insert to all users" ON "public"."social_ride" AS RESTRICTIVE FOR INSERT WITH CHECK (false);

CREATE POLICY "Disable insert to all users" ON "public"."sous_events" AS RESTRICTIVE FOR INSERT WITH CHECK (false);

CREATE POLICY "Disable select to all users" ON "public"."action_tracking" AS RESTRICTIVE FOR SELECT USING (false);

CREATE POLICY "Disable to insert all users" ON "public"."ressources_categories" AS RESTRICTIVE FOR INSERT WITH CHECK (false);

CREATE POLICY "Disable update to all users" ON "public"."action_tracking" AS RESTRICTIVE FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Disable update to all users" ON "public"."app_state" AS RESTRICTIVE FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Disable update to all users" ON "public"."favourite_organisateurs" AS RESTRICTIVE FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Disable update to all users" ON "public"."prix" AS RESTRICTIVE FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Disable update to all users" ON "public"."ressources" AS RESTRICTIVE FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Disable update to all users" ON "public"."ressources_categories" AS RESTRICTIVE FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Disable update to all users" ON "public"."social_ride" AS RESTRICTIVE FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Disable update to all users" ON "public"."sous_events" AS RESTRICTIVE FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "Enable everyone to know who is friend with who" ON "public"."friendships" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."app_state" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."events" FOR SELECT TO "authenticated", "anon" USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."favourite_events" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."favourite_organisateurs" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."organisateurs" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."prix" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."ressources" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."ressources_categories" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."social_ride" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."sous_events" FOR SELECT USING (true);

CREATE POLICY "Enable update to all users" ON "public"."organisateurs" FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Feedback entries are insertable by everyone" ON "public"."feedback_entries" FOR INSERT WITH CHECK (true);

ALTER TABLE "public"."action_tracking" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."app_features" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."app_state" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."collection_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."collections" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."deletion_requests" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."event_submission_contacts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."favourite_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."favourite_organisateurs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."feedback_entries" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."inscription_notif" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."next_adventures" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."organisateurs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."prix" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ressources" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ressources_categories" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."social_ride" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."sous_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."user_public" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_public: read all" ON "public"."user_public" FOR SELECT TO "authenticated" USING (true);

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."broadcast_testflight_notification"("p_title" "text", "p_body" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."broadcast_testflight_notification"("p_title" "text", "p_body" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."broadcast_testflight_notification"("p_title" "text", "p_body" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "service_role";

GRANT ALL ON FUNCTION "public"."debug_get_filtered_events"("_start_date" "text", "_end_date" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_get_filtered_events"("_start_date" "text", "_end_date" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_get_filtered_events"("_start_date" "text", "_end_date" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."delete_auth_user"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_auth_user"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_auth_user"("user_uuid" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."ensure_organisateur"("organizer_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_organisateur"("organizer_name" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_all_users"("current_u" "text", "term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_users"("current_u" "text", "term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_users"("current_u" "text", "term" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_event_favourite_counts"("p_event_ids" integer[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_event_favourite_counts"("p_event_ids" integer[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_event_favourite_counts"("p_event_ids" integer[]) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_event_likes"("event_id" bigint, "c_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_event_likes"("event_id" bigint, "c_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_event_likes"("event_id" bigint, "c_user" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_favourite_events"("p_user_id" "uuid", "p_upcoming" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_favourite_events"("p_user_id" "uuid", "p_upcoming" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_favourite_events"("p_user_id" "uuid", "p_upcoming" boolean) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_favourite_orga"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_favourite_orga"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_favourite_orga"("p_user_id" "uuid") TO "service_role";

GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";

GRANT ALL ON FUNCTION "public"."get_filtered_events"("_term" "text", "_start_date" "text", "_end_date" "text", "_distance_range" "text"[], "_bike_types" "text"[], "_ranking" "text"[], "_region" "text"[], "_budget" "text", "_limit" integer, "_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_filtered_events"("_term" "text", "_start_date" "text", "_end_date" "text", "_distance_range" "text"[], "_bike_types" "text"[], "_ranking" "text"[], "_region" "text"[], "_budget" "text", "_limit" integer, "_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_filtered_events"("_term" "text", "_start_date" "text", "_end_date" "text", "_distance_range" "text"[], "_bike_types" "text"[], "_ranking" "text"[], "_region" "text"[], "_budget" "text", "_limit" integer, "_offset" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_filtered_events"("_term" "text", "_start_date" "text", "_end_date" "text", "_distance_range" "text"[], "_bike_types" "text"[], "_ranking" "text"[], "_region" "text"[], "_budget" "text", "_limit" integer, "_offset" integer, "_chip_type_event" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_filtered_events"("_term" "text", "_start_date" "text", "_end_date" "text", "_distance_range" "text"[], "_bike_types" "text"[], "_ranking" "text"[], "_region" "text"[], "_budget" "text", "_limit" integer, "_offset" integer, "_chip_type_event" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_filtered_events"("_term" "text", "_start_date" "text", "_end_date" "text", "_distance_range" "text"[], "_bike_types" "text"[], "_ranking" "text"[], "_region" "text"[], "_budget" "text", "_limit" integer, "_offset" integer, "_chip_type_event" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_filtered_events"("_term" "text", "_start_date" "text", "_end_date" "text", "_distance_range" "text"[], "_bike_types" "text"[], "_ranking" "text"[], "_region" "text"[], "_budget" "text", "_limit" integer, "_offset" integer, "_chip_type_event" "text", "_mixite" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_filtered_events"("_term" "text", "_start_date" "text", "_end_date" "text", "_distance_range" "text"[], "_bike_types" "text"[], "_ranking" "text"[], "_region" "text"[], "_budget" "text", "_limit" integer, "_offset" integer, "_chip_type_event" "text", "_mixite" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_filtered_events"("_term" "text", "_start_date" "text", "_end_date" "text", "_distance_range" "text"[], "_bike_types" "text"[], "_ranking" "text"[], "_region" "text"[], "_budget" "text", "_limit" integer, "_offset" integer, "_chip_type_event" "text", "_mixite" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_friends_who_liked_event"("current_u" "text", "event_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_friends_who_liked_event"("current_u" "text", "event_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_friends_who_liked_event"("current_u" "text", "event_id" bigint) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_next_favourite_event"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_favourite_event"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_favourite_event"("p_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_organizer_details"("organizer_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_organizer_details"("organizer_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organizer_details"("organizer_id" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_popular_events"() TO "service_role";

GRANT ALL ON FUNCTION "public"."get_popular_events"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_popular_events"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_popular_events"("p_limit" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_user_favourite_events"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_favourite_events"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_favourite_events"("p_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_user_relationship_data"("c_user" "uuid", "profile_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_relationship_data"("c_user" "uuid", "profile_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_relationship_data"("c_user" "uuid", "profile_user" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."has_unread_notifications"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_unread_notifications"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_unread_notifications"("_user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."notify_dot_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_dot_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_dot_event"() TO "service_role";

GRANT ALL ON FUNCTION "public"."notify_friend_accepted"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_friend_accepted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_friend_accepted"() TO "service_role";

GRANT ALL ON FUNCTION "public"."notify_friend_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_friend_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_friend_request"() TO "service_role";

GRANT ALL ON FUNCTION "public"."notify_new_event_from_favourite_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_event_from_favourite_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_event_from_favourite_org"() TO "service_role";

GRANT ALL ON FUNCTION "public"."refresh_popular_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_popular_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_popular_events"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."save_event_proposal_review"("p_event_id" bigint, "p_event" "jsonb", "p_routes" "jsonb", "p_status" "text", "p_reason" "text", "p_reviewer" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_event_proposal_review"("p_event_id" bigint, "p_event" "jsonb", "p_routes" "jsonb", "p_status" "text", "p_reason" "text", "p_reviewer" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."set_orga_image"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_orga_image"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_orga_image"() TO "service_role";

GRANT ALL ON FUNCTION "public"."sync_user_public"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_public"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_public"() TO "service_role";

GRANT ALL ON FUNCTION "public"."upcomi_event_slugify"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upcomi_event_slugify"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upcomi_event_slugify"("value" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."update_nb_events_for_organisateur"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_nb_events_for_organisateur"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_nb_events_for_organisateur"() TO "service_role";

GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";

GRANT ALL ON FUNCTION "public"."update_user_fcm"("p_fcm" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_fcm"("p_fcm" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_fcm"("p_fcm" "text") TO "service_role";

GRANT ALL ON TABLE "public"."action_tracking" TO "anon";
GRANT ALL ON TABLE "public"."action_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."action_tracking" TO "service_role";

GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";

GRANT ALL ON TABLE "public"."app_features" TO "service_role";

GRANT ALL ON TABLE "public"."app_state" TO "anon";
GRANT ALL ON TABLE "public"."app_state" TO "authenticated";
GRANT ALL ON TABLE "public"."app_state" TO "service_role";

GRANT ALL ON SEQUENCE "public"."app_stats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."app_stats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."app_stats_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."collection_events" TO "anon";
GRANT ALL ON TABLE "public"."collection_events" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_events" TO "service_role";

GRANT ALL ON TABLE "public"."collections" TO "anon";
GRANT ALL ON TABLE "public"."collections" TO "authenticated";
GRANT ALL ON TABLE "public"."collections" TO "service_role";

GRANT ALL ON TABLE "public"."deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."deletion_requests" TO "service_role";

GRANT ALL ON SEQUENCE "public"."deletion_requests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."deletion_requests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."deletion_requests_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."event_submission_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."event_submission_contacts" TO "service_role";

GRANT ALL ON SEQUENCE "public"."event_tracking_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_tracking_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_tracking_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."favourite_events" TO "anon";
GRANT ALL ON TABLE "public"."favourite_events" TO "authenticated";
GRANT ALL ON TABLE "public"."favourite_events" TO "service_role";

GRANT ALL ON SEQUENCE "public"."favourite_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."favourite_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."favourite_events_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."favourite_organisateurs" TO "anon";
GRANT ALL ON TABLE "public"."favourite_organisateurs" TO "authenticated";
GRANT ALL ON TABLE "public"."favourite_organisateurs" TO "service_role";

GRANT ALL ON SEQUENCE "public"."favourite_organisateurs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."favourite_organisateurs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."favourite_organisateurs_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";

GRANT ALL ON TABLE "public"."feedback_entries" TO "anon";
GRANT ALL ON TABLE "public"."feedback_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_entries" TO "service_role";

GRANT ALL ON SEQUENCE "public"."feedback_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."feedback_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."feedback_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."friendships" TO "anon";
GRANT ALL ON TABLE "public"."friendships" TO "authenticated";
GRANT ALL ON TABLE "public"."friendships" TO "service_role";

GRANT ALL ON SEQUENCE "public"."friendships_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."friendships_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."friendships_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."inscription_notif" TO "anon";
GRANT ALL ON TABLE "public"."inscription_notif" TO "authenticated";
GRANT ALL ON TABLE "public"."inscription_notif" TO "service_role";

GRANT ALL ON SEQUENCE "public"."inscription_notif_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inscription_notif_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inscription_notif_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."next_adventures" TO "anon";
GRANT ALL ON TABLE "public"."next_adventures" TO "authenticated";
GRANT ALL ON TABLE "public"."next_adventures" TO "service_role";

GRANT ALL ON SEQUENCE "public"."next_adventures_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."next_adventures_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."next_adventures_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";

GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."organisateurs" TO "anon";
GRANT ALL ON TABLE "public"."organisateurs" TO "authenticated";
GRANT ALL ON TABLE "public"."organisateurs" TO "service_role";

GRANT ALL ON SEQUENCE "public"."organisateurs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."organisateurs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."organisateurs_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."prix" TO "anon";
GRANT ALL ON TABLE "public"."prix" TO "authenticated";
GRANT ALL ON TABLE "public"."prix" TO "service_role";

GRANT ALL ON SEQUENCE "public"."prix_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."prix_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."prix_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";

GRANT ALL ON SEQUENCE "public"."reports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reports_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reports_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."ressources" TO "anon";
GRANT ALL ON TABLE "public"."ressources" TO "authenticated";
GRANT ALL ON TABLE "public"."ressources" TO "service_role";

GRANT ALL ON TABLE "public"."ressources_categories" TO "anon";
GRANT ALL ON TABLE "public"."ressources_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."ressources_categories" TO "service_role";

GRANT ALL ON SEQUENCE "public"."ressources_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ressources_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ressources_categories_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."ressources_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ressources_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ressources_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."social_ride" TO "anon";
GRANT ALL ON TABLE "public"."social_ride" TO "authenticated";
GRANT ALL ON TABLE "public"."social_ride" TO "service_role";

GRANT ALL ON SEQUENCE "public"."social_ride_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."social_ride_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."social_ride_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."sous_events" TO "anon";
GRANT ALL ON TABLE "public"."sous_events" TO "authenticated";
GRANT ALL ON TABLE "public"."sous_events" TO "service_role";

GRANT ALL ON SEQUENCE "public"."sous_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sous_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sous_events_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."user_public" TO "anon";
GRANT ALL ON TABLE "public"."user_public" TO "authenticated";
GRANT ALL ON TABLE "public"."user_public" TO "service_role";

GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";


