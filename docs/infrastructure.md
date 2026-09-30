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

## State as of 2026-09-30, after Phase 2

- Migrations 0001 through 0004 are applied.
  Seed data is loaded. RLS is on for every table.
- Vercel holds `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for all environments. Deployment
  protection covers preview deploys only; production is public.
- Production deploys from `main` automatically.

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
