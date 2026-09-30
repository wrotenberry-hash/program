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
- [x] Founder decision on the stack: web-first, mobile-first (2026-09-30)
- [x] The six sharding proposals stand as working defaults until the founder
      changes one. Changing any of them is an escalation (`CLAUDE.md` §4).

**Checkpoint: passed.** Phase 1 may begin in the next session.

## Phase 1 — Foundation

The deployable shell with nothing to play yet. **Built 2026-09-30.**

- [x] Next.js app on Vercel, production at https://program-flax.vercel.app
- [x] Supabase auth with email; Google button wired, provider awaits the
      founder's Google Cloud credentials in the Supabase dashboard
- [x] Date of birth at signup (and at school pick for Google signups)
- [x] Migrations 0001 and 0002: reference tables, profiles, the League shard
      tables, monetization config tables. RLS on every table before seed.
- [x] Seed: 138 FBS schools, 11 conferences, 237 rivalry pairings, the 2026
      calendar, sharding tunables in `game_config`
- [x] `lib/flags.ts` with `monetizationEnabled` off
- [x] `lib/database.types.ts` generated from the database

**Checkpoint: ready for the founder to test.** Sign up on a phone, pick a
school, see the program screen naming school, conference and season week,
in light and dark. Verified so far: every screen renders at phone width in
both modes; the database enforces owner-only reads, one program per account,
and a locked school; the production URL serves the app and guards the
program route. The signup email link needs the Supabase Site URL set to the
production domain before it works off localhost (see `infrastructure.md`).

## Phase 2 — Program and placement

The Athletic Director half of the fantasy, and the shard model made real.
**Built 2026-09-30.**

- [x] Placement on program creation, exactly as `sharding-and-rivalry.md` §6.1:
      rivalry-fill scoring, the faction cap, new Leagues born with house
      programs in every slot. Runs in `place_program()` on a database trigger.
- [x] Faction auto-join; the first fan of a school in a League founds the
      faction. Dormancy sweep exists (`sweep_dormant_seats`) but is not yet
      scheduled; Phase 3 adds the cron.
- [x] Facilities, budget, and boosters: six facilities with five levels each,
      booster income by the hour capped at eight hours, one upgrade at a time
      with a timer, collect and claim. All numbers are config.
- [x] Faction chat over Realtime, scoped by RLS to the faction.
- [x] Faction page: roster (display name, role, last active) and the League's
      human factions versus house-run slots.

**Checkpoint: ready for the founder to test.** Two friends of different
schools each create a program, each land in a League, each see their faction
with a founder or member state, and each have booster income to collect on
their next visit. Verified in the database: an Oklahoma fan lands in the
Texas fan's League because of the rivalry; a second Texas fan joins as a
member; a Michigan fan founds Big Ten League 1; with the cap set to one, a
second Oklahoma fan opens SEC League 2; strangers cannot read a faction's
roster, programs, chat, or anyone's date of birth.

Visibility decision made by default, for the founder to confirm:
faction-mates see each other's display name, program, role, and last-active
time. Nothing else.

## Phase 3 — Power, staff, and matchups

The thing the whole product turns on. Design: `docs/phase-3/power-and-matchups.md`.

- [x] Power as one number on the program screen, from facility levels
      (2026-09-30)
- [ ] Facets and emphasis: config weights, the weekly emphasis picker
- [ ] Assistant staff as the hero layer: coordinators, position coaches,
      recruiting coordinator, strength coach, each with power and a lean.
      Placeholder art.
- [ ] `packages/sim`: the matchup resolver. Pure, seeded, no I/O. Inputs are
      two frozen facet-power sets. Output is a score, the facet results, and
      the narrative.
- [ ] Scheduler: Vercel Cron resolving one League-week per call from a queue
      table; also runs the dormancy sweep
- [ ] Non-conference challenge between friends

**Checkpoint:** the two friends challenge each other in a non-conference
week, the resolver settles it, and both see the score, the narrative, and
which facets decided it. Replaying the stored seed and inputs produces the
same result.

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
