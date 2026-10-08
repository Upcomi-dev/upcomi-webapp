# Onboarding: event selection and adventure stories

Run `pnpm install --frozen-lockfile`, `npx playwright install chromium`, then `npm run test:onboarding`.
Playwright starts the real Next.js app on port 3107 with an isolated fake
Supabase HTTP API on port 4318. No real account, recommendation or story is
created. The tests use Chromium on desktop and an iPhone-sized viewport,
including keyboard event selection, draft restoration, successive stories,
explicit finalization and failure recovery.
The API fixture is shared, so this suite intentionally uses one worker.

Screenshots of the story screen and event chooser are saved in `test-results/`.
RPC counts are simulated in browser tests; database behavior is tested separately.

Run `psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/event-story-counts.sql`
against an **empty, disposable PostgreSQL database**. This applies the actual
counting migration to a minimal schema with owner-only RLS, verifies moderation
statuses, cross-author counts, zero counts, duplicate IDs and access rights,
then rolls back all fixtures. Do not run this fixture script on a Supabase project.

## Delivery

The previously shipped `20261007202118_event_story_counts.sql` remains available.
It depends on the private schema and grants introduced by
`20261005194920_harden_onboarding_profile_sync.sql`. The old RPC remains intact
for older clients. The current onboarding uses explicit manual selection and no
longer requests counts or preselects an event. Saved stories remain visible with
a green check and cannot be selected again during the same session.

## Local preview

Open `/dev/onboarding` with the development server to start directly at the
event list without any preselection. This uses fictional events and simulates saves and
completion without writing to Supabase. Use “Recommencer le test” to reset.
The route is unavailable in production.
