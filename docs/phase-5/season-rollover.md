# Season rollover

Architecture. Status: **built and tested in the local staging copy
2026-10-01; wired into production maintenance, first fires 2026-12-06.**
Founder brief: standings reset, programs persist, 2027 calendar seeded.

---

## 1. The rule in one sentence

Nothing a player owns is ever reset; everything that is a *season result* is
keyed by `season_id`, so a new season simply has no rows yet.

## 2. What persists and what resets

| Data | Keyed by | At rollover |
|---|---|---|
| Programs, budget, facilities, staff, emphasis, share code | program | Persists, untouched |
| League seats, faction membership, roles | program, League | Persists. Dormancy rules continue as before |
| Leagues and factions | League | Persist. Some Leagues become *settled* (§4) |
| Games, results, seeds, inputs | season | Kept forever as history |
| Faction standings | season | New season starts empty. Old season frozen as final |
| Nation ledger | season | Same |
| Rivalry trophies | season | Kept forever. The trophy case shows every season |
| Weekly faction goals | season, week | New season starts empty |
| Daily check-in streaks and task claims | calendar day | Unaffected by seasons |
| Feedback | none | Unaffected |

Because results are season-keyed, "reset" is not a delete. No migration or
job ever removes a past season's standings.

## 3. The season state machine

`seasons.status`: `upcoming → active → complete`. Exactly one season may be
active. New columns `activated_at` and `completed_at` record when each
transition happened.

`advance_season(p_today date default current_date)` runs inside
`run_maintenance` every ten minutes and is idempotent:

1. Any active season whose `ends_on` is before `p_today` is closed: standings
   and the Nation ledger are recomputed one last time, then the season is
   marked `complete`.
2. Leagues are settled per §4.
3. If no season is active, the earliest `upcoming` season whose `starts_on`
   has arrived becomes `active`.

`p_today` exists so the rollover can be tested on any date in staging.

Maintenance order is now: resolve due games, refresh standings, advance the
season, schedule the current week, sweep dormancy. Resolving first means the
last week's games always count toward the season they belong to.

## 4. Settling Leagues

Design §6.2 (`sharding-and-rivalry.md`) says a League accepts new fans for
`LEAGUE_OPEN_SEASONS` full seasons, then is settled and takes new fans only by
invite. At each rollover, a League is settled when the number of completed
seasons that *started after the League opened* reaches `LEAGUE_OPEN_SEASONS`
(default 1). A League opened mid-2026 is therefore still open through all of
2027 and settles when 2027 completes. Settling never moves anyone.

## 5. The offseason

The 2026 season ends 2026-12-05 and 2027 starts 2027-08-28. Between them:

- `current_week()` returns nothing, so no League games are scheduled.
- The League and Nation screens show the most recent completed season's
  final standings, labeled *Final*, through `season_display()`.
- The program screen shows the offseason and when the next season kicks off.
- Building, staff, friendly challenges, chat, and daily rewards (when on)
  continue as normal. Weekly faction goals are season-week based, so they
  pause.

Nine months is a long offseason. What players do in it is a product
decision, not a data-model one; this design does not foreclose any answer.

## 6. Explicitly not in this design

- **Transfers.** The design calls for an offseason transfer window. Not
  built; nothing here prevents it.
- **Real conference realignment.** `schools.conference_id` is not
  season-scoped. If a school changes conference for 2027, its existing
  League seats sit in the old conference's League. Supporting realignment
  needs a season-scoped school-to-conference table and a remap step at
  rollover. Flagged for when a 2027 change is announced.
- **Season rewards.** No end-of-season prizes are granted. The trophy case
  and frozen standings are the record.

## 7. How it was tested

In the local staging copy (`scripts/staging-db/up.sh`), with fans, Leagues,
games, standings, trophies, goals, and daily claims in place:
`advance_season('2026-12-04')` changes nothing; `advance_season('2026-12-06')`
completes 2026, leaves 2027 upcoming, and keeps every program, seat, and
balance; a second call is a no-op; `advance_season('2027-08-28')` activates
2027 with empty standings while 2026's standings and trophies remain intact;
a League opened in 2026 settles only after 2027 completes.
