# CONTEXT.md — decisions from founder Q&A

These OVERRIDE the base prompt wherever they conflict.

## Player
- Core player: a die-hard fan of ONE real school. Loyalty is the hook.
- Fantasy: Athletic Director + Head Coach. As AD you build facilities,
  budget, and boosters. As HC you run the roster, scheme, and lineup.
- HEROES = assistant staff (coordinators, position coaches, recruiting
  coordinator, S&C coach). This replaces "head coach as hero."

## Social structure (three layers)
1. Own program = the base. Every fan runs their own version of their school.
2. School Faction = the alliance. Fans of the same school are allies,
   never rivals.
3. Conference = the real-conference grouping of factions. This is the
   faction-vs-faction arena (Last War server-war equivalent). Conference
   Rivalry Week is faction vs faction (e.g., Texas vs OU).
- Scale problem to solve in Phase 0: popular schools may have tens of
  thousands of fans. Propose a server/shard model with faction size caps,
  and explain how cross-server rivalry works.

## World
- Programs persist forever. Conference standings reset each season,
  aligned to the real college calendar.
- Real-world team results: cosmetic/event tie-ins ONLY (e.g., a real win
  unlocks a celebration cosmetic or a themed event). Never stat boosts.

## Game day
- Pre-game control only: scheme, depth chart/lineup, game-plan choices.
  A server-side sim resolves the game and outputs a box score, a short
  narrative, and key moments. No live input.

## Sessions
- Support both 5-minute check-ins (collect, queue, claim) and multi-hour
  play (map, events, faction activity). No hard daily cap on engagement.

## Monetization
- Last War-style whale model: premium currency, speed-ups, packs, passes,
  staff shards.
- Build it as a config-driven, flag-gated layer so it can be tuned or
  softened to fit licensing terms.
- Include odds disclosure and age-gating hooks from day one.
- ESCALATE: randomized paid rewards, minors, and anything a school's
  licensing office would need to approve.

## Visual
- Stylized cartoon, Last War-adjacent tone, all original art. The
  stylization also keeps distance from real-athlete likeness. Use
  placeholder art in the slice; a product designer will own final UI.

## Updated slice success
- Two friends who are fans of DIFFERENT schools can each build their
  program for a week, each join their school's faction, and meet in a
  simulated rivalry game.

## Decisions since the Q&A
- 2026-09-30: Stack is web-first and mobile-first as proposed in
  `docs/phase-0/stack.md`. Native client deferred until after the slice.
- 2026-09-30: The six sharding proposals in
  `docs/phase-0/sharding-and-rivalry.md` §8 stand as working defaults.
- 2026-09-30: One profile. The player runs the whole program; there is no
  athletic director mode and no head coach mode. The fantasy stays the same,
  the UI never splits it.
- 2026-09-30: Matchups are not a game simulation. A program's power is put
  up against another program's power, with high-level emphasis choices
  (running game, passing game, and a few more). Design in
  `docs/phase-3/power-and-matchups.md`.
- 2026-09-30: The look and feel is not deferred. The app must read as a
  colorful, cartoon, Last War-style mobile game from the first build: bright,
  inviting, always a tap to make. "Placeholder art" means the designer owns
  the final character and building art, not that the shell may look like a
  utility app. Spec in `docs/design.md`.
- 2026-09-30: Matchup model decided. Four facets (rushing, passing, run
  defense, pass defense). Six emphases (Balanced, Ground and pound, Air raid,
  Stack the box, Cover shell, Ball control). Moderate variance: a 10% power
  edge wins about two of three, a 30% edge about nine of ten. Staff power
  comes from shards and levels, Last War style.
- 2026-09-30: The resolver runs inside the database as a SQL function, not a
  TypeScript package, because that is the only place a result cannot be
  forged by a player calling our functions directly. Same determinism: a
  stored seed and frozen inputs replay to the same result.
- 2026-10-02: Rivalry Week beta. A few hundred invited fans from two or
  three rival schools play from Rivalry Week (2026-11-28). Public soft launch
  at the start of the 2027 season. Plan in `docs/beta-plan.md`.
- 2026-10-02: The beta is 18+ only. Signups under 18 are turned away.
- 2026-10-02: Notifications are off hold for the beta: email and browser
  alerts, opt-in only. The sending service is still a dependency decision
  (CLAUDE.md §4) and comes back to the founder before it is added.
- 2026-10-02: Season prizes are in-game budget, never real money.
- 2026-10-02: Build toward the beta now, behind flags, while the private
  test runs. Results feed, monetization, and native app stay on hold.
