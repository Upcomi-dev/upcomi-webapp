-- Existing event triggers use unqualified public table names, so the review
-- transaction must expose the public schema while keeping a fixed search path.
alter function public.save_event_proposal_review(bigint, jsonb, jsonb, text, text, uuid)
  set search_path = public;
