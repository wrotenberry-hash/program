# Sharding, faction caps, and cross-server rivalry

Phase 0 design. Status: **proposal, awaiting founder decision** on the items in
§8. Everything numeric here is a default for config, not a commitment.

---

## 1. The problem

Fans of one school are allies, never rivals (`CONTEXT.md`). A faction is the
alliance those fans join. But a faction only works as an alliance if it is
small enough for its members to know each other, coordinate, and matter to
one another. Texas may bring tens of thousands of fans. Vanderbilt may bring
a few hundred. One faction per school cannot be both an alliance and the whole
fan base.

So the fan base of a school has to be split into many factions, each capped,
and each faction has to sit inside a conference arena where it can compete
against rival schools. The questions are:

1. How big is a faction?
2. What is a server, and how does a new player land in one?
3. What happens to conferences where the small schools run out of fans long
   before the big schools do?
4. How do fans of the same school, split across many servers, still feel like
   one nation rather than strangers?
5. How do two friends who support different schools end up in the same game?

## 2. Vocabulary

| Term | Meaning |
|---|---|
| **Program** | One player's instance of one school. Owned by one account. Persists forever. |
| **School** | A real school, with a real conference membership. Global, not per server. |
| **Faction** | All programs of one school inside one League. The alliance. Capped. |
| **League** | One server-side instance of one real conference. Holds exactly one faction slot per member school. The standings and rivalry arena. Numbered per conference: `SEC-017`, `B1G-042`. |
| **House program** | A sim-controlled program that fills a school's slot in a League when no human faction is present. Always on the schedule, never on the leaderboard. |
| **Nation** | Every faction of one school across every League. The cross-server identity. `Texas Nation` is all Texas factions everywhere. |
| **Rivalry pairing** | A fixed school-versus-school pairing (Texas–Oklahoma, Michigan–Ohio State, Auburn–Alabama). Config, one primary rival per school, optional secondaries. |

## 3. The model in one paragraph

A League is the shard. Each League is a full copy of one real conference with
one faction slot per school. Factions are capped at `FACTION_CAP` members. New
programs are placed into the League that gives them the most live rivals.
Slots that no human fills are run by house programs so every League always has
a full conference. Within a League, the season is faction versus faction.
Across Leagues, the only competition is Nation versus Nation, so fans of the
same school never face each other anywhere in the game. Non-conference weeks
are cross-League and cross-conference, and that is where friends of different
schools meet.

## 4. Faction cap

**Default `FACTION_CAP = 100` active members.**

- This is the alliance size that Last War and its peers have converged on. It
  is the largest group where a chat channel stays readable, where an officer
  can know who is active, and where one member's contribution to a faction
  event is visible.
- Tunable in config. Phase 1 should test 60 and 150 against chat activity and
  event participation before locking it.
- **Active** means logged in within `DORMANCY_DAYS` (default 30). A dormant
  member drops to *alumni* status: still a faction member in name, still owns
  their program, no longer occupies a slot. Returning alumni reclaim a slot if
  one is open, otherwise are offered placement in another League for their
  school (§6.3).
- Officer roles (leader, up to `OFFICER_COUNT` officers, default 5) manage
  invites, kicks, and event assignments. Details belong to a later phase.

**Rejected: a variable cap that scales with fan count.** Making Texas
factions 4,000 strong so that Texas and Vanderbilt have the same number of
factions destroys the alliance feel for exactly the fans the game most needs
to keep.

**Rejected: one giant faction per school with sub-chapters.** It hides the
same problem one layer down and makes "faction versus faction" meaningless,
because the faction is now a fan base, not a team.

## 5. The League as shard

### 5.1 What a League contains

- One faction slot per school in the real conference. With sixteen-team
  conferences that is at most `16 × FACTION_CAP` = 1,600 programs. Small by
  server-game standards, and that is intentional: the League is a
  neighborhood, not a metropolis.
- A season schedule generated per League, aligned to the real calendar.
- Standings, faction rankings, and rivalry results, all reset at season
  start.
- League chat, League events, and the League's Rivalry Week bracket.

### 5.2 Why the League is the partition

Everything that a game action touches lives inside one League: the faction,
the opponent, the schedule, the standings. That makes `league_id` a clean
partition key for game state. Global tables (accounts, schools, the item
catalog, Nation leaderboards) sit outside the partition and are read-mostly.
Each League's sim can run as an independent job. Physical sharding by
`league_id` is a later operational choice; the logical model does not change.

### 5.3 What is per-League, what is global

| Per League | Global |
|---|---|
| Factions and memberships | Accounts |
| Schedules and game results | Schools, conferences, rivalry pairings |
| Standings and Rivalry Week | Programs (the program itself, not its League seat) |
| League chat and events | Item catalog, cosmetics, monetization config |
| House programs | Nation leaderboards and Nation events |

A program is global because it persists forever and can move between Leagues.
Its *seat* in a League is a membership row, not the program itself.

## 6. Placement

### 6.1 New program

When a program is created for school `S` in conference `C`:

1. Collect candidate Leagues: every League of `C` where faction `S` has fewer
   than `FACTION_CAP` active members and the League is still **open**
   (§6.2).
2. Score each candidate by **rivalry fill**: the number of active human
   members in the factions of `S`'s rivalry pairings, weighted primary rival
   first. Add a smaller weight for total active humans in the League.
3. Place into the highest-scoring candidate. Tie-break to the lowest League
   number.
4. If there are no candidates, create League `C-(n+1)` and place there. The
   new League is born with house programs in every other slot.

The effect: a new Texas fan lands in the League where Oklahoma is most alive,
not simply the newest one. Big rivalry pairs pull each other into the same
Leagues, which is where the fun is.

### 6.2 Open and settled Leagues

A League is **open** for `LEAGUE_OPEN_SEASONS` (default 1 full season) after
creation. After that it is **settled**: it still runs, but new programs are
placed there only by faction invite. This keeps a brand-new program from being
placed into a League whose factions are three seasons ahead of it, which is
the failure mode every server game eventually hits.

Invites are the friend path. A settled League with an open slot accepts an
invited program at any time.

### 6.3 Transfers

A program may transfer to another League once per `TRANSFER_WINDOW` (default:
the offseason) into any League with an open slot for its school. The program
carries everything it owns. It leaves behind League-scoped state only: its
seat, its standings line, its faction role. This is how a returning alumni
program, or a player whose friends are elsewhere, relocates.

### 6.4 Friends of different schools

Two friends, one Texas and one Michigan, are in different conferences and will
never share a League. They meet through **non-conference games** (§7.3). If
they are in the same conference, one may invite the other into their League
during placement, and rivalry fill scoring already favors that outcome for
rival pairs.

## 7. Competition

### 7.1 Inside a League: faction versus faction

Every program plays its own season. Its opponents each week are drawn from the
opposing school's faction in the same League: a human program when one is
available and unmatched that week, a house program otherwise. Each program
keeps its own record.

Faction standing is the aggregate. **Proposed:** a faction's weekly score is
the sum of its top `FACTION_SCORING_N` (default 50) program results, in the
manner of alliance events in the reference games. A sum over the whole faction
rewards recruiting over quality; an average punishes a faction for carrying
newcomers; a top-N sum rewards both depth and quality without punishing
either. This is a §8 decision.

**Conference Rivalry Week** is the headline: the League's rivalry pairings
play as faction-versus-faction events with the week's results, a dedicated
bracket screen, and a cosmetic trophy for the winning faction that persists
until the next Rivalry Week.

### 7.2 Across Leagues: Nation versus Nation, never League versus League

The reference games pit servers against servers. This game cannot: a League
versus League event would put Texas-017 against Texas-042, and same-school
fans are never rivals. So the cross-server axis is **school versus school at
Nation scale**:

- **Nation Rivalry** runs alongside Conference Rivalry Week. Every Texas
  faction's Rivalry Week result rolls up into Texas Nation's total against
  Oklahoma Nation's total. One Nation wins. The prize is a Nation-wide
  cosmetic and a place on the Nation ledger.
- **Nation leaderboards** rank Nations by season aggregate. They are the
  bragging-rights layer, and the only leaderboard where a fan of a small
  school and a fan of a big school compete for the same thing: their school's
  place in the country.
- **Orphaned rivalries.** When a faction's primary rival in its own League is
  a house program, that faction is entered into the **rivalry pairing pool**
  for its pairing, and matched for Rivalry Week against a human faction of the
  rival school from another League that is in the same position. Both
  factions get a real opponent; the sim does not care which League the
  opponent lives in. Pool matching prefers factions of similar active size and
  season record.

A Nation is the fan base. A faction is the team. Cross-server competition is
between fan bases, so it never asks a fan to beat a fan of their own school.

### 7.3 Non-conference weeks: the cross-League door

Real seasons open with non-conference games and carry one or two more
mid-season. The game mirrors that. In non-conference weeks a program's
opponent can come from any League and any conference:

- **Challenge slot.** A program may send one non-conference challenge per
  non-conference week to any program it is friends with. Accepted challenges
  are scheduled and resolved by the same server sim. This is the slice
  scenario: the Texas friend and the Michigan friend challenge each other in
  week 1, and meet in a simulated game.
- **Open slot.** Unfilled non-conference games are matched from a global pool
  by rating band, never against the same school, or fall back to a house
  program.

Non-conference results count toward a program's own record and toward Nation
aggregates. They do not count toward League faction standings, which stay
purely in-conference.

## 8. Decisions needed from the founder

| # | Decision | Proposal | What changes if you choose differently |
|---|---|---|---|
| 1 | `FACTION_CAP` | 100 | Larger means fewer, fuller Leagues and quieter chat. Smaller means more house programs. |
| 2 | Faction scoring | Sum of top 50 results | Whole-faction sum rewards recruiting; average penalizes carrying newcomers. |
| 3 | Do house programs count toward standings? | Yes, as opponents; they hold no standings line themselves | If they hold a line, human factions can finish behind a computer, which reads as a bug to players. |
| 4 | `LEAGUE_OPEN_SEASONS` | 1 season | Longer means newcomers face more advanced factions. Shorter means more Leagues and more house programs. |
| 5 | Real conference realignment | Remap Leagues at the season boundary, programs keep their seat if the school stays, otherwise are placed fresh in the new conference | Ignoring it desyncs the game from the calendar the whole product is aligned to. |
| 6 | Secondary rivalries | Config allows up to two, weighted below primary | Primary-only makes placement simpler and Rivalry Week thinner. |

## 9. Sizing sketch

Assumptions for illustration only. Real numbers come from the slice.

| School | Fans | Factions at cap 100 | Leagues needed |
|---|---|---|---|
| Texas | 30,000 | 300 | 300 |
| Oklahoma | 18,000 | 180 | 180 |
| Vanderbilt | 800 | 8 | 8 |

With placement by rivalry fill, Texas and Oklahoma share their first 180
Leagues and the remaining 120 Texas factions are pool-matched for Rivalry
Week against Oklahoma factions whose own Texas slot is house-run. Vanderbilt
is human in 8 Leagues and house-run in the rest, which is fine: every League
still fields a full conference, and every Vanderbilt fan has a full alliance.

## 10. How this serves the slice

Two friends, one Texas fan and one Michigan fan, each install the game.

1. Each creates a program. Placement puts the Texas fan in the SEC League with
   the most active Oklahoma fans and the Michigan fan in the Big Ten League
   with the most active Ohio State fans.
2. Each joins their school's faction in that League automatically. For a week
   they build facilities, set lineups, and take part in faction activity.
3. In non-conference week 1 the Texas fan sends the Michigan fan a challenge.
   The server sim resolves it and both see the box score, narrative, and key
   moments.
4. Rivalry Week arrives. Each plays faction versus faction against their
   in-League rival, and each result rolls up into their Nation's total.

Nothing in the slice requires more than two Leagues to exist. Nothing in it
changes when there are three hundred.

## 11. Data model sketch

Enough to check the model holds together. Not a migration.

```
schools            id, name, conference_id, primary_rival_school_id
conferences        id, name
rivalry_pairings   school_a_id, school_b_id, rank (1 = primary)
leagues            id, conference_id, number, opened_at, settled_at
factions           id, league_id, school_id            -- unique (league_id, school_id)
programs           id, account_id, school_id, created_at   -- never deleted
league_seats       program_id, league_id, faction_id, role, status (active|alumni), joined_at
house_programs     league_id, school_id                 -- present where no faction is
games              id, league_id (nullable for non-conference), week, home_program_id, away_program_id, resolved_at, result
nation_ledger      school_id, season, event, score
```

`league_id` on `games` is nullable because non-conference games cross Leagues.
That is the one place the partition leaks, and it is deliberate.
