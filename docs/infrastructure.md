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

## State as of 2026-09-30

- The Supabase project has no tables, no migrations, and no RLS policies.
  Phase 1 writes the first migration and enables RLS before any seed lands
  (`CLAUDE.md` §3, §5).
- The Vercel project has never deployed. The first push containing a
  Next.js app will deploy it.
- No environment variables are set anywhere yet.
