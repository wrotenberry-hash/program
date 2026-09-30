# CLAUDE.md

Working agreement and conventions for this repository. Read this before any task.
`CONTEXT.md` holds the founder's decisions and wins wherever the two conflict.

---

## 1. What this project is

A mobile-first program-builder game for die-hard fans of one real college
football school. The player runs their own version of their school's program
as one profile, with no mode split between athletic director and coach. Fans
of the same school are allies in a faction. Factions meet fans of rival
schools in a weekly season of matchups: one program's power against
another's, not a game simulation. Tone and business model are Last
War-adjacent: stylized cartoon, long-lived progression, a whale-friendly
monetization layer.

The sentence the product exists to deliver: *"My school, my program, my people,
against theirs."*

The three social layers, in order of intimacy:

1. **Program** — one player's instance of their school. Persists forever.
2. **Faction** — all players of one school inside one League. Allies, never rivals.
3. **Conference (League)** — the real-conference grouping of factions. This is
   the faction-versus-faction arena. See `docs/phase-0/sharding-and-rivalry.md`.

## 2. Stack

Approved 2026-09-30. `docs/phase-0/stack.md` is authoritative and has the
reasoning; this table is the summary.

| Layer | Choice | Notes |
|---|---|---|
| Client | Next.js 15 (App Router), mobile-first web, installable as a PWA | Server Components by default. The client is the replaceable layer. |
| Language | TypeScript, strict mode | No `any` without a comment justifying it |
| Database | Supabase Postgres | `league_id` on every League-scoped table. RLS before data. |
| Auth | Supabase Auth | Email + Google. Date of birth collected at signup. |
| Realtime | Supabase Realtime | Faction chat, League feeds |
| Sim | `packages/sim`, pure TypeScript, seeded, no I/O | Server-side only. Every game stores seed and frozen inputs. |
| Scheduler | Vercel Cron, one League-week per call, Postgres queue table | |
| Styling | Tailwind CSS | Confirm major version before adding config |
| Art | Placeholders in `public/placeholder/` | A product designer owns final UI |
| Hosting | Vercel | Preview deploy per branch |
| Payments | Deferred until after the slice | Rail is a founder decision |

Do not introduce additional frameworks, ORMs, state libraries, component
kits, or a game engine without asking.

## 3. Non-negotiables

Correctness requirements, not preferences. Violating one is a bug even if the
feature works.

### 3.1 Real-world results never touch the sim

A real win, loss, ranking, or recruit unlocks cosmetics and themed events
only. It never changes a rating, a coefficient, a roll, or a reward table.
The sim is sealed from the real season.

### 3.2 Same-school fans are never opponents

No mode, event, bracket, or leaderboard may put two programs of the same school
against each other. Cross-League competition is school versus school, never
League versus League, for exactly this reason.

### 3.3 Matchups are server-resolved, pre-game only, and not a simulation

A matchup is one program's power against another's, shaped by a high-level
emphasis the player picks before the week locks. The server resolves it from
frozen inputs and a stored seed and returns a score, a short narrative, and
the facet results. There is no play-by-play, no live input, no client-side
resolution, and no replay with different inputs. Design:
`docs/phase-3/power-and-matchups.md`.

### 3.4 Programs persist, standings reset

A program is never deleted, reset, or merged away. League standings reset at
each season boundary, aligned to the real college calendar. Anything that
would erase a program's history is an escalation.

### 3.5 Monetization is a layer, not a foundation

Every purchasable, price, drop rate, and pass tier lives in config behind a
feature flag, default off. The game must run with the whole layer disabled.
Odds disclosure and age-gating hooks ship with the first purchasable, not
after it.

### 3.6 Original art only

All art is original and stylized. No real athlete's name, number, likeness,
or identifiable stat line appears anywhere. School marks, colors, and names
are a licensing question and belong to the escalation list.

### 3.7 It looks and feels like a game

Founder decision, 2026-09-30. Every screen reads as a colorful cartoon mobile
game in the Last War register: saturated color on deep backgrounds, chunky
rounded panels, big numbers, and a glowing button whenever there is
something to collect or claim. A screen with nothing inviting to tap is a
defect. `docs/design.md` is the spec and every value in it is literal. Both
light and dark are tested on every screen.

### 3.8 Both session lengths are first-class

A five-minute check-in (collect, queue, claim) and a multi-hour session (map,
events, faction activity) must both feel complete. No hard daily cap on
engagement, and no feature that only makes sense at one of the two lengths.

## 4. Escalation list

Stop and ask before doing any of the following. Do not decide these
autonomously.

- Any randomized paid reward: loot boxes, gacha pulls, mystery packs, paid
  shards with random outcomes.
- Anything that touches minors: age gates, parental controls, content
  ratings, data collection from under-18 accounts.
- Anything a school's licensing office would need to approve: use of marks,
  colors, mascots, stadium names, fight songs, or the school name in a
  purchasable.
- Any use of a real person's name or likeness.
- Any change to sim fairness: RNG seeding, paid modifiers to game resolution,
  or anything that lets money change a result after kickoff.
- Changing the faction size cap, League placement rules, or the definition of
  a rivalry pairing.
- Any change to what data one player can see about another.
- Adding a dependency or choosing a stack component.

## 5. Conventions

- Decisions are recorded, not remembered. A founder decision goes into
  `CONTEXT.md`. A design decision goes into a document under `docs/` with the
  alternatives considered and why they lost.
- Every tunable number (caps, rates, prices, windows) is named, has a stated
  default, and is marked as config. Never hard-code a balance value.
- Plain language for the founder. The project owner is non-technical. Report
  what was built and what a tradeoff is in plain words, and skip implementation
  detail unless it affects a decision.
- Say when something is uncertain. A flagged uncertainty is cheap. A
  confidently wrong game-economy decision is not.

## 6. How we work

- **Phases run back to back when the founder says so.** Decided 2026-09-30.
  A session may carry several phases. What does not change: each phase still
  ends at its checkpoint, and the next one begins only after the founder has
  been told the checkpoint is ready to test. New information from the founder
  is folded into `CONTEXT.md` and the affected documents as it arrives.
- **Checkpoint before proceeding.** Each phase ends with something the founder
  can read, click, or play. Report it plainly, then continue.
- **The slice is the target.** Two friends who are fans of different schools
  each build their program for a week, each join their school's faction, and
  meet in a simulated rivalry game. Every Phase 0 document must say how it
  serves that scenario.

## 7. Repository map

```
CONTEXT.md            Founder decisions. Authoritative.
CLAUDE.md             This file.
/docs
  roadmap.md          Phased build plan and checkpoints
  infrastructure.md   Where the repo, database, and hosting live. No secrets.
  /phase-0            Design documents for Phase 0
    sharding-and-rivalry.md   Server/shard model, faction caps, cross-server rivalry
    stack.md                  Stack proposal
/app                Next.js App Router. Server Components; actions in actions.ts
/components         Shared UI. Client Components only for chat and countdowns
/lib                Supabase clients, flags, database types, helpers
/supabase
  /migrations       SQL migrations, ordered. Applied via Supabase.
  /seed             CSVs and build.py that generates seed.sql
```

## 8. Database rules learned the hard way

- Never write an RLS policy on a table that queries that same table, even
  through a join. Postgres reports infinite recursion. Put the check in a
  SECURITY DEFINER function (see `is_faction_mate`, `is_faction_member`).
- Every SECURITY DEFINER function pins `search_path = public` and has
  EXECUTE revoked from `anon`, and from `authenticated` unless the app calls
  it. The Supabase security advisor flags anything else.
- All game-state writes go through SECURITY DEFINER functions that derive the
  program from `auth.uid()`. Client code never inserts into League or economy
  tables directly.
