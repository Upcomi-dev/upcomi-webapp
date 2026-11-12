-- 20260909104122 a recréé la fonction avec `search_path = ''`, annulant
-- 20260716102836 : les triggers de `events` citent `organisateurs` sans schéma,
-- d'où « relation "organisateurs" does not exist » au refus/validation.
alter function public.save_event_proposal_review(bigint, jsonb, jsonb, text, text, uuid)
  set search_path = public;
