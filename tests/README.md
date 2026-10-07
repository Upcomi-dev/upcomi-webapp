# Onboarding: one adventure story

Run `npm ci`, `npx playwright install chromium`, then `npm run test:onboarding`.
Playwright starts the real Next.js app on port 3107 with an isolated fake
Supabase HTTP API on port 4318. No real account, recommendation or story is
created. The tests use Chromium on desktop and an iPhone-sized viewport,
including keyboard event selection, draft restoration and failure recovery.
The API fixture is shared, so this suite intentionally uses one worker.

Screenshots of the story screen and event chooser are saved in `test-results/`.
RPC counts are simulated in browser tests; database behavior is tested separately.

Run `psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/event-story-counts.sql`
against an **empty, disposable PostgreSQL database**. This applies the actual
counting migration to a minimal schema with owner-only RLS, verifies moderation
statuses, cross-author counts, zero counts, duplicate IDs and access rights,
then rolls back all fixtures. Do not run this fixture script on a Supabase project.

## Delivery

Apply `20261007202118_event_story_counts.sql` before deploying the frontend.
It depends on the private schema and grants introduced by
`20261005194920_harden_onboarding_profile_sync.sql`. The old RPC remains intact
for older clients. If the new RPC is unavailable, the UI proposes the first
recommended event and still permits choosing another.
