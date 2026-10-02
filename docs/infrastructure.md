# Infrastructure

Where the project lives. No secrets in this file; keys and passwords go in
environment variables and the hosting dashboards only.

| Resource | Value | Notes |
|---|---|---|
| GitHub repository | `wrotenberry-hash/program` | Private. `main` is the production branch. |
| Vercel team | Wilson (`wrotenberry`) | `team_seJtkiZUYs8ibdwERG3uC0N5` |
| Vercel project | `program` | `prj_yUFKr3Em85X4XBtcBTgOudNTUPD9`. Linked to the repository. Every push to `main` deploys production; every other branch gets a preview URL. |
| Supabase organization | wrotenberry@gmail.com's Org | Pro plan. `lyuzldhygdaixuoduagm` |
| Supabase project | Program | Ref `xrthgxxeaeojexagglix`, region `us-east-1`, Postgres 17. Created 2026-09-30 by the founder in the dashboard. |
| Supabase API URL | `https://xrthgxxeaeojexagglix.supabase.co` | Public. The publishable key is fetched from the dashboard into Vercel environment variables in Phase 1. |

## State as of 2026-10-01, test week

- Migrations 0001 through 0023 are applied.
  Seed data is loaded, including the 2027 calendar (status upcoming).
  RLS is on for every table. `feedback` and `admin_tokens` have RLS on and no
  policies on purpose: only their SECURITY DEFINER functions touch them.
- Feature flags (`lib/flags.ts`) read Vercel environment variables:
  `FLAG_SCHOOL_NAMES=1` in every environment for the private test;
  `FLAG_DAILY_REWARDS`, `FLAG_FACTION_GOALS`, `FLAG_SEASON_REWARDS` and
  `FLAG_ADULTS_ONLY` unset (off). The database enforces the same gates with
  `game_config` keys `FEATURE_DAILY_REWARDS`, `FEATURE_FACTION_GOALS`,
  `FEATURE_SEASON_REWARDS` and `FEATURE_ADULTS_ONLY`, all 0. A recorded date
  of birth can no longer be changed by the player (0023). Turning a feature on takes both: the
  env var in Vercel and the config key set to 1.
- Founder page: `/founder?token=…` shows return visits by sign-up week and
  links the feedback export. Same private key as the export.
- Feedback export: `/api/feedback/export?token=…` (CSV; add `&format=json`).
  The token is held by the founder; only its SHA-256 is in the database.
- Staging copy: `scripts/staging-db/up.sh` builds a local Postgres 16
  database from every migration and the seed, and
  `scripts/staging-db/test-test-week.sql` runs the test-week checks against
  it (37 checks, including a full season rollover);
  `test-season-rewards.sql` covers season-end rewards (28 checks);
  `test-activity.sql` covers return-visit tracking (10 checks);
  `test-adults-only.sql` covers the 18+ check (10 checks). A hosted Supabase
  staging branch is not set up; it is a billable resource awaiting the
  founder's approval.
- Vercel holds `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for all environments. Deployment
  protection covers preview deploys only; production is public.
- Production deploys from `main` automatically.
- A Vercel cron (`vercel.json`) calls `/api/cron/resolve` every ten minutes: it schedules the current week for every League, resolves due games, refreshes standings, and sweeps dormant seats.
  Set `CRON_SECRET` in Vercel to require a bearer token on that route; until
  then the route is open but harmless (idempotent, no inputs).

## Founder dashboard settings still needed

Supabase, Authentication, URL Configuration:
- Site URL: `https://program-flax.vercel.app`
- Redirect URLs: add `https://program-flax.vercel.app/auth/callback` and
  `https://*-wrotenberry.vercel.app/auth/callback` (previews).
  Until this is set, confirmation emails send people to localhost.

Supabase, Authentication, Providers: enable Google with a client ID and
secret from Google Cloud. The app's Google button already points at it.

Supabase, Authentication, Password security: enable leaked password
protection. This is the one remaining security advisor warning.
