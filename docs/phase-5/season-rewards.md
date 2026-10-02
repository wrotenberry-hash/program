# Season-end rewards

Migration `0020_season_rewards.sql`. Behind `FLAG_SEASON_REWARDS` (app) and
`FEATURE_SEASON_REWARDS` (database), both off in production until the founder
approves.

## What happens when a season ends

`advance_season()` completes the season (see `season-rollover.md`) and then
calls `award_season()`, which:

1. Records every faction's final place in its League in
   `faction_season_finishes`. Places rank by points, then wins. Ties share a
   place. This is the permanent record of who won each League.
2. Works out one reward row per active fan in `program_season_rewards`:
   - **Place reward**: `SEASON_REWARD_PLACES` by the fan's faction place
     (default 1st $3,000, 2nd $1,500, 3rd $750). The fan must have played at
     least one League game, so joining in the last week and never playing does
     not earn a championship prize. A faction alone in its League with no games
     wins nothing.
   - **Played reward**: `SEASON_REWARD_PLAYED` ($500) for playing at least
     `SEASON_REWARD_MIN_GAMES` (3) League games. Friendly challenges and
     voided games do not count.

All amounts are fixed config values. Nothing is random, nothing is paid for.
House programs get nothing.

## Claiming

Rewards are recorded even while the feature is off, so turning it on later
loses nobody's prize. With the feature on, a "Season rewards" card appears on
the program screen and one tap claims everything waiting.
`claim_season_rewards()` pays once; a second claim is refused.

## Who sees what

A fan reads only their own reward rows. Final places are readable by any
signed-in player, the same as the standings they come from. No new data about
other players is exposed.

## Known limits

- A fan whose seat was swept as dormant before the season ended gets nothing
  for that season, even if they played most of it.
- Changing the amounts after a season ends does not change rewards already
  recorded for it.

## Tests

`scripts/staging-db/test-season-rewards.sql`, 19 checks, run on a fresh
staging copy.
