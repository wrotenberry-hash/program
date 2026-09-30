# Program

Run your school's program. Join your faction. Meet your rival.

Read `CLAUDE.md` first, then `CONTEXT.md`. Design documents live in `docs/`.

## Run locally

```
cp .env.example .env.local   # fill in the two Supabase values
npm install
npm run dev
```

## Checks

```
npm run lint
npm run typecheck
npm run build
```

## Database

Schema changes are SQL files in `supabase/migrations`, applied to the Supabase
project in order. Reference data is generated from CSVs in `supabase/seed`.
Regenerate `lib/database.types.ts` after every migration.
