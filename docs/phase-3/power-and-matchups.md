# Power and matchups

Phase 3 design. Status: **decided by the founder 2026-09-30, all four proposals as written.** Written
2026-09-30 from the founder's direction that this is not a game simulation:
the power of one program is put up against the power of another, with a few
high-level emphasis choices.

---

## 1. What the founder asked for

- One profile. The player runs the whole program. There is no athletic
  director mode and no head coach mode.
- No game simulation. A matchup is your program's power against theirs.
- Emphasis choices at a high level: lean on the running game, the passing
  game, and a handful of other things. Nothing play-by-play.

## 2. Power

**Power is one number**, shown large on the program screen, in the manner of
the reference games. It is the sum of every contributor's power:

| Contributor | Source of power | Status |
|---|---|---|
| Facilities | Each facility level carries a power value in `facility_levels.power` | Live now |
| Staff (the heroes) | Coordinators, position coaches, recruiting coordinator, strength coach. Each has a power value and a specialty. | Phase 3 |
| Roster | Recruiting classes and development add power over seasons | Phase 4 |
| Boosters | The booster club's level counts, like any facility | Live now |

Power only goes up. Nothing on the schedule reduces it; a loss costs standing,
not power. Real-world results never change it (`CLAUDE.md` §3.1).

## 3. Facets

Power splits into four facets. Every contributor feeds all four by default;
some contributors lean toward one:

| Facet | Fed most by |
|---|---|
| Rushing | Weight room, running backs coach, offensive line coach |
| Passing | Film room, quarterbacks coach, receivers coach |
| Run defense | Weight room, defensive line coach, linebackers coach |
| Pass defense | Film room, secondary coach |

A contributor's power is distributed across facets by weights stored in
config. A facility with no lean splits evenly. The stadium and academic
center split evenly. Facet totals always add back up to Power.

## 4. Emphasis

Before each week's matchup a player picks one **emphasis** from a short list.
Emphasis moves a slice of facet power around. It never creates power.

| Emphasis | Effect (defaults, config) |
|---|---|
| Balanced | No change |
| Ground and pound | +25% rushing, −15% passing |
| Air raid | +25% passing, −15% rushing |
| Stack the box | +25% run defense, −15% pass defense |
| Cover shell | +25% pass defense, −15% run defense |
| Ball control | +10% rushing, +10% run defense, −10% passing, −10% pass defense |

The last chosen emphasis carries over week to week, so a five-minute check-in
never has to touch it. A player who wants to scout the opponent and switch
can. Lock time is the week's `locks_at`.

## 5. The matchup

Two programs, A and B, each with four facet powers after emphasis.

1. **Offense against defense, twice each way.** A's rushing against B's run
   defense; A's passing against B's pass defense; then B's offense against
   A's defense. Each pairing yields an edge: `edge = (attack − defense) /
   (attack + defense)`, a number between −1 and 1.
2. **Points from edges.** Each edge converts to expected points through a
   config curve; a big rushing edge means a big rushing day. Four edges give
   two expected scores.
3. **Variance, seeded.** A seeded random draw nudges each expected score by a
   config-bounded amount, so the stronger side usually wins but does not
   always. The seed and the frozen inputs are stored, and replaying them
   gives the same result.
4. **Output.** A final score, a one-paragraph narrative built from which edges
   decided it ("Your ground game ran over their front seven"), and the four
   facet results so the player sees what worked. No box score of players; no
   drives; no plays.

A house program has facet powers set from its school's baseline in config,
so an empty slot still produces a real matchup.

## 6. What this is not

- Not a simulation. There is no play, drive, or clock.
- Not pay-to-win at kickoff. Power comes from the program; money speeds
  building power (the monetization layer, when on) and never touches
  resolution. `CLAUDE.md` §4 lists paid modifiers to resolution as an
  escalation.
- Not zero-sum on power. Nobody loses power by losing a game.

## 7. Decisions (made 2026-09-30, all as proposed)

| # | Decision | Proposal |
|---|---|---|
| 1 | Four facets, as above | Rushing, passing, run defense, pass defense. Special teams can be a fifth later. |
| 2 | Emphasis list | The six above, tunable in config |
| 3 | Variance | Enough that a 10% power edge wins about two of three, a 30% edge about nine of ten |
| 4 | Where staff power comes from | Hero shards and levels, Last War style; the staff roster is Phase 3's main build |

## 8. Where the resolver runs

In the database, as `resolve_due_games()`. It reads both programs' facet
powers itself, draws from a seeded generator, writes the score, the facet
results, the narrative, and a snapshot of the inputs, and never accepts a
result from outside. Anyone may call it; it only resolves games whose lock
time has passed and does the same thing no matter who calls. The Vercel
cron calls it on a schedule and the matchups screen calls it on load, so a
due game resolves even if the cron is late.

Calibration: expected margin is `POINTS_PER_EDGE × (sum of a side's two
offensive edges − the other side's)`, with normal noise of `SCORE_NOISE_SD`
on each score. With `POINTS_PER_EDGE = 28` and `SCORE_NOISE_SD = 8.5`, a 10%
power edge wins about 67% and a 30% edge about 89%.
