# CLAUDE.md

Working agreement and conventions for this repository. Read this before any task.
`CONTEXT.md` holds the founder's decisions and wins wherever the two conflict.

---

## 1. What this project is

A mobile-first program-builder game for die-hard fans of one real college
football school. The player is both Athletic Director and Head Coach of their
own version of their school. Fans of the same school are allies in a faction.
Factions meet fans of rival schools in a simulated season. Tone and business
model are Last War-adjacent: stylized cartoon, long-lived progression, a
whale-friendly monetization layer.

The sentence the product exists to deliver: *"My school, my program, my people,
against theirs."*

The three social layers, in order of intimacy:

1. **Program** — one player's instance of their school. Persists forever.
2. **Faction** — all players of one school inside one League. Allies, never rivals.
3. **Conference (League)** — the real-conference grouping of factions. This is
   the faction-versus-faction arena. See `docs/phase-0/sharding-and-rivalry.md`.

## 2. Stack

Not chosen yet. Do not add application code, a framework, or a dependency
until a stack proposal has been written to `docs/phase-0/stack.md` and the
founder has approved it. The founder's other projects run Next.js, Supabase
Postgres, and Vercel, so that is the default candidate for the web and data
layers. The server-side game simulation and the League sharding model may
justify something else, and that is the question the proposal must answer.

Until then this repository holds documents only.

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

### 3.3 The sim is server-authoritative and pre-game only

Players set scheme, depth chart, and game plan before kickoff. The server
resolves the game and returns a box score, a short narrative, and key moments.
There is no live input, no client-side resolution, and no replay with
different inputs.

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

### 3.7 Both session lengths are first-class

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

- **One phase per session.** Phase 0 is design documents only. Do not begin a
  later phase because the current one finished early. Stop and report.
- **Checkpoint before proceeding.** Each phase ends with something the founder
  can read, click, or play. Confirm the checkpoint passes before moving on.
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
  /phase-0            Design documents for Phase 0
    sharding-and-rivalry.md   Server/shard model, faction caps, cross-server rivalry
    stack.md                  Stack proposal
```
