# Roadmap

Phased build plan to the slice, with a checkpoint per phase. One phase per
session (`CLAUDE.md` §6). Later-phase features land behind flags, default
off, rather than being held out of the codebase.

The slice: two friends who are fans of different schools each build their
program for a week, each join their school's faction, and meet in a
simulated rivalry game.

## Phase 0 — Design

Documents only. No code.

- [x] `CONTEXT.md` — founder decisions
- [x] `CLAUDE.md` — working agreement, non-negotiables, escalation list
- [x] `docs/phase-0/sharding-and-rivalry.md` — server/shard model
- [x] `docs/phase-0/stack.md` — stack proposal
- [ ] Founder decisions: the six in the sharding document, the one in the
      stack document

**Checkpoint:** the founder has read both proposals and answered the seven
decisions. Until then the six sharding proposals stand as working defaults.

## Phase 1 — Foundation

The deployable shell with nothing to play yet.

- Next.js app on Vercel with a preview deploy per branch
- Supabase project, auth with email and Google, date of birth at signup
- Migrations: schools, conferences, rivalry pairings, leagues, factions,
  programs, league seats, house programs, the season calendar. RLS on every
  table before seed data lands.
- Seed: every FBS school and conference, primary rivalries, the current
  season's calendar
- `lib/flags.ts` with `monetization_enabled` off and the empty config tables
- Type generation from the database

**Checkpoint:** a friend can sign up on their phone, pick their school, and
see an empty program screen that names their school and conference. Both
light and dark render.

## Phase 2 — Program and placement

The Athletic Director half of the fantasy, and the shard model made real.

- Placement on program creation, exactly as `sharding-and-rivalry.md` §6
- Faction auto-join with the cap and dormancy rules
- Facilities, budget, and boosters: a small set of build-and-wait actions
  with timers, so the five-minute check-in loop exists
- Faction chat over Realtime
- House programs created for every empty slot in a new League

**Checkpoint:** two friends of different schools each create a program, each
land in a League, each see their faction with at least one other member or a
clear "you founded this faction" state, and each have something to collect
on their next visit.

## Phase 3 — Roster, staff, and the sim

The Head Coach half, and the thing the whole product turns on.

- `packages/sim`: deterministic, seeded, pure. Inputs are two frozen
  programs. Output is an event log, from which the box score, narrative, and
  key moments derive.
- Roster and depth chart, scheme choice, game-plan choices as the pre-game
  inputs
- Assistant staff as the hero layer: coordinators, position coaches,
  recruiting coordinator, strength coach. Placeholder art.
- Scheduler: Vercel Cron resolving one League-week per call from a queue
  table
- Non-conference challenge between friends

**Checkpoint:** the two friends challenge each other in a non-conference
week, the sim resolves it, and both see the box score, the narrative, and
the key moments. Replaying the stored seed and inputs produces the same
result.

## Phase 4 — The season and Rivalry Week

- The full in-League schedule against rival factions, with house programs
  filling gaps
- Faction standings by the agreed scoring rule
- Conference Rivalry Week as faction versus faction, with the bracket screen
  and the persistent cosmetic trophy
- Nation roll-up and the Nation leaderboard
- Orphaned-rivalry pool matching

**Checkpoint:** the slice. Two friends, one week each, factions joined, a
rivalry game simulated. Both can point at their Nation's total and say who
won.

## After the slice

Not scheduled. Listed so they are not forgotten and so nothing here is
mistaken for a Phase 4 deliverable.

- Native client, if the slice earns it
- Monetization layer switched on, after the payment-rail decision and the
  escalations in `CLAUDE.md` §4
- Real-world tie-ins: cosmetics and themed events driven by real results
- Multi-hour session content: the map, League events, faction activities
- Licensing: school marks and names, which gate everything visible
