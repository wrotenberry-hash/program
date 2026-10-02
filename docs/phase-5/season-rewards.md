# Season-end rewards

Migrations `0020_season_rewards.sql` and `0021_season_reward_eligibility.sql`. Behind `FLAG_SEASON_REWARDS` (app) and
`FEATURE_SEASON_REWARDS` (database), both off in production until the founder
approves.

## What happens when a season ends

`advance_season()` completes the season (see `season-rollover.md`) and then
calls `award_season()`, which:

1. Records every faction's final place in its League in
   `faction_season_finishes`. Places rank by points, then wins. Ties share a
   place. This is the permanent record of who won each League.
2. Works out one reward row per fan, from the season's League games
   (conference and rivalry; friendly challenges and voided games never
   count). Every game records which faction each side played for, so
   eligibility comes from the games, not from who holds a seat on the last
   day:
   - **Place prize**: `SEASON_REWARD_PLACES` by the final place of the
     faction the fan played the most League games for that season (default
     1st $3,000, 2nd $1,500, 3rd $750), and only if that is at least
     `SEASON_REWARD_PLACE_MIN_GAMES` (3) games. If two factions tie for most
     games, the better place counts. One place prize per fan per season,
     never two.
   - **Played prize**: `SEASON_REWARD_MIN_GAMES` (3) League games in total,
     for any faction, earns `SEASON_REWARD_PLAYED` ($500).

   What this means in practice:
   - A fan who plays 6 games and then goes inactive keeps both prizes.
   - A fan who joins in the final week and plays once gets nothing.
   - A fan who plays 2 games for the champions, switches, and plays 3 for a
     2nd-place faction gets the 2nd-place prize. They did not help win the
     title.
   - A faction alone in its League with no games wins nothing.

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

- Changing the amounts after a season ends does not change rewards already
  recorded for it.
- A fan who goes inactive still has to come back to claim. Nothing is paid
  out without a claim.

## History

- 0020 (2026-10-02): eligibility by active seat at season end; place prize
  needed 1 game.
- 0021 (2026-10-02, founder change): eligibility by League games played for
  each faction; place prize needs 3 games for that faction. Applied before
  any season completed, so no recorded rewards changed.

## Tests

`scripts/staging-db/test-season-rewards.sql`, 28 checks on a fresh staging
copy, including the late joiner, the fan who goes inactive after 6 games, and
the fan who switches factions mid-season.
