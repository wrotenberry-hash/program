import type { ProgramViewProps } from "@/components/program-view";
import type { FactionViewProps } from "@/components/faction-view";
import type { DailyStatus } from "@/components/daily-card";
import type { FactionGoalStatus } from "@/components/faction-goal-card";

import { noop } from "@/app/preview/actions";
import { renderNarrative, schoolSubtitle, shortName, teamName, type SchoolNames } from "@/lib/schools";

const S = (id: string, name: string, nickname: string, full_name: string, city: string, state: string, generic_name: string, generic_nickname: string): SchoolNames =>
  ({ id, name, nickname, full_name, city, state, generic_name, generic_nickname });
const TX = S("texas", "Texas", "Longhorns", "University of Texas at Austin", "Austin", "TX", "Austin", "Guardians");
const OU = S("oklahoma", "Oklahoma", "Sooners", "University of Oklahoma", "Norman", "OK", "Norman", "Condors");
const AL = S("alabama", "Alabama", "Crimson Tide", "University of Alabama", "Tuscaloosa", "AL", "Tuscaloosa", "Phantoms");
const AU = S("auburn", "Auburn", "Tigers", "Auburn University", "Auburn", "AL", "Auburn", "Avalanche");
const GA = S("georgia", "Georgia", "Bulldogs", "University of Georgia", "Athens", "GA", "Athens (GA)", "Barracudas");
const MI = S("michigan", "Michigan", "Wolverines", "University of Michigan", "Ann Arbor", "MI", "Ann Arbor", "Sabres");
const OSU = S("ohio-state", "Ohio State", "Buckeyes", "The Ohio State University", "Columbus", "OH", "Columbus", "Tempest");
const now = Date.now();

export const sampleProgram: Omit<ProgramViewProps, "actions"> = {
  displayName: "Wilson",
  programName: teamName(TX),
  school: { name: shortName(TX), full_name: schoolSubtitle(TX), city: null, state: null },
  conferenceShort: "SEC",
  seasonLabel: "2026 · Week 4",
  seat: { factionName: teamName(TX), leagueLabel: "SEC League 1", role: "leader" },
  factionRank: 2,
  cash: 1240,
  incomeRate: 150,
  accrued: 610,
  capped: false,
  capHours: 8,
  facilities: [
    { facility_id: "booster-club", level: 2, upgrade_to: null, upgrade_completes_at: null, facility: { name: "Booster Club", description: "", sort_order: 10 } },
    { facility_id: "stadium", level: 1, upgrade_to: 2, upgrade_completes_at: new Date(now - 1000).toISOString(), facility: { name: "Stadium", description: "", sort_order: 20 } },
    { facility_id: "weight-room", level: 1, upgrade_to: null, upgrade_completes_at: null, facility: { name: "Weight Room", description: "", sort_order: 30 } },
    { facility_id: "practice-facility", level: 0, upgrade_to: null, upgrade_completes_at: null, facility: { name: "Practice Facility", description: "", sort_order: 40 } },
    { facility_id: "film-room", level: 0, upgrade_to: null, upgrade_completes_at: null, facility: { name: "Film Room", description: "", sort_order: 50 } },
    { facility_id: "academic-center", level: 0, upgrade_to: null, upgrade_completes_at: null, facility: { name: "Academic Center", description: "", sort_order: 60 } },
  ],
  levels: [
    ...[50, 80, 120, 170, 230].map((power, i) => ({ facility_id: "booster-club", level: i + 1, cost: [0, 500, 1500, 4000, 10000][i], duration_seconds: [0, 300, 1800, 7200, 28800][i], income_per_hour: [100, 150, 220, 320, 450][i], power })),
    ...["stadium", "weight-room", "practice-facility", "film-room", "academic-center"].flatMap((f) =>
      [100, 180, 300, 480, 750].map((power, i) => ({ facility_id: f, level: i + 1, cost: [300, 800, 2000, 5000, 12000][i], duration_seconds: [120, 600, 2700, 10800, 36000][i], income_per_hour: null, power })),
    ),
  ],
  busy: true,
  staffHired: 2,
  staffTotal: 11,
  staffPower: 130,
  canScout: true,
  record: { wins: 2, losses: 1 },
  emphasisName: "Air raid",
  shareCode: "WGFCL8",
  dueGames: 1,
};

export const sampleActions: ProgramViewProps["actions"] = { joinFaction: noop, collectIncome: noop, startUpgrade: noop, claimUpgrade: noop, signOut: noop, claimCheckin: noop, claimDailyTask: noop };

export const sampleDaily: DailyStatus = {
  enabled: true,
  day: "2026-10-01",
  checkin: { claimed: false, streak: 3, reward: 200, ladder: [100, 150, 200, 250, 300, 400, 600] },
  tasks: [
    { id: "collect", label: "Collect from your boosters", reward: 100, done: true, claimed: true },
    { id: "scout", label: "Send your scouts out", reward: 100, done: true, claimed: false },
    { id: "challenge", label: "Challenge a friend", reward: 200, done: false, claimed: false },
  ],
};

export const sampleGoal: FactionGoalStatus = {
  enabled: true,
  seated: true,
  role: "leader",
  can_set: true,
  officers: 1,
  officer_cap: 5,
  members: 3,
  week: { season_id: "2026", week_number: 5 },
  goal: { type_id: "league-wins", label: "Win League games", blurb: "Wins by anyone in the faction this week.", target: 2, reward: 500, progress: 1, met: false, claimed: false, locked: true },
  types: [
    { id: "league-wins", label: "Win League games", blurb: "Wins by anyone in the faction this week.", reward: 500, target: 2 },
    { id: "league-games", label: "Show up", blurb: "League games played by the faction this week.", reward: 300, target: 3 },
    { id: "challenges", label: "Throw down", blurb: "Friendly challenges sent or received by faction members this week.", reward: 400, target: 2 },
  ],
};

export const sampleFaction: FactionViewProps = {
  leagueLabel: "SEC League 1",
  factionName: teamName(TX),
  role: "leader",
  cap: 100,
  myProgramId: "me",
  factionId: "00000000-0000-0000-0000-000000000000",
  members: [
    { program_id: "me", display_name: "Wilson", role: "leader", last_active_at: new Date(now).toISOString(), is_me: true },
    { program_id: "b", display_name: "Bevo Forever", role: "member", last_active_at: new Date(now - 3600e3 * 5).toISOString(), is_me: false },
    { program_id: "c", display_name: "HookEm41", role: "member", last_active_at: new Date(now - 86400e3 * 2).toISOString(), is_me: false },
  ],
  messages: [
    { id: 1, program_id: "b", body: "Who's building the stadium first?", created_at: new Date(now - 3600e3).toISOString() },
    { id: 2, program_id: "me", body: "Me. Claiming level 2 tonight.", created_at: new Date(now - 1800e3).toISOString() },
    { id: 3, program_id: "c", body: "OU fans just showed up in our League. Rivalry Week is gonna be loud.", created_at: new Date(now - 600e3).toISOString() },
  ],
  leagueSchools: [
    { school_id: "texas", name: shortName(TX) },
    { school_id: "oklahoma", name: shortName(OU) },
    { school_id: "alabama", name: shortName(AL) },
  ],
  conferenceSize: 16,
};

import type { MatchupsViewProps } from "@/components/matchups-view";
import type { StaffViewProps } from "@/components/staff-view";

export const sampleMatchups: Omit<MatchupsViewProps, "actions"> = {
  myProgramId: "me",
  myName: teamName(TX),
  shareCode: "WGFCL8",
  seasonLabel: "2026 · Week 4",
  facets: { rushing: 180, passing: 265, run_defense: 210, pass_defense: 205, total: 860 },
  emphasisId: "air-raid",
  emphases: [
    { id: "balanced", name: "Balanced", blurb: "No lean. Take what they give you.", rushing: 1, passing: 1, run_defense: 1, pass_defense: 1 },
    { id: "ground-and-pound", name: "Ground and pound", blurb: "Run it down their throat.", rushing: 1.25, passing: 0.85, run_defense: 1, pass_defense: 1 },
    { id: "air-raid", name: "Air raid", blurb: "Spread them out and throw.", rushing: 0.85, passing: 1.25, run_defense: 1, pass_defense: 1 },
    { id: "stack-the-box", name: "Stack the box", blurb: "Dare them to pass.", rushing: 1, passing: 1, run_defense: 1.25, pass_defense: 0.85 },
    { id: "cover-shell", name: "Cover shell", blurb: "Take away the deep ball.", rushing: 1, passing: 1, run_defense: 0.85, pass_defense: 1.25 },
    { id: "ball-control", name: "Ball control", blurb: "Run it, stop the run, shorten the game.", rushing: 1.1, passing: 0.9, run_defense: 1.1, pass_defense: 0.9 },
  ],
  games: [
    { id: "g1", kind: "conference", status: "scheduled", locks_at: new Date(now + 4 * 60e3).toISOString(), week_number: 4, home_program_id: "me", away_program_id: "ou", inputs: null, result: null, home_name: teamName(TX), away_name: teamName(OU) },
    {
      id: "g2", kind: "challenge", status: "resolved", locks_at: new Date(now - 3600e3).toISOString(), week_number: 4, home_program_id: "mi", away_program_id: "me",
      inputs: { home: { program_id: "mi", name: "Michigan Wolverines", emphasis: "ground-and-pound", total: 790, rushing: 260, passing: 160, run_defense: 190, pass_defense: 180 }, away: { program_id: "me", name: teamName(TX), emphasis: "air-raid", total: 860, rushing: 180, passing: 265, run_defense: 210, pass_defense: 205 } },
      result: { home_score: 24, away_score: 31, winner_program_id: "me", edges: { home_rush: 0.11, home_pass: -0.12, away_rush: -0.03, away_pass: 0.19 }, decisive: "away_pass", narrative: renderNarrative({ narrative: "Texas Longhorns beat Michigan Wolverines 31–24. Texas Longhorns threw it all over Michigan Wolverines's secondary.", narrative_template: "{away} beat {home} 31–24. {away} threw it all over {home}'s secondary." }, teamName(MI), teamName(TX)) },
      home_name: teamName(MI), away_name: teamName(TX),
    },
  ],
};

export const sampleStaff: Omit<StaffViewProps, "actions"> = {
  cash: 1240,
  nextScoutAt: null,
  scoutShards: 5,
  levelCostBase: 200,
  staff: [
    { id: "oc-vasquez", name: "Rae Vasquez", role: "Offensive Coordinator", rarity: "epic", base_power: 120, power_per_level: 12, unlock_shards: 40, star_shards: 40, max_stars: 5, max_level: 20, lean: "passing", shards: 15, stars: 0, level: 1 },
    { id: "qb-lindqvist", name: "Sofia Lindqvist", role: "Quarterbacks Coach", rarity: "rare", base_power: 80, power_per_level: 8, unlock_shards: 20, star_shards: 20, max_stars: 5, max_level: 20, lean: "passing", shards: 4, stars: 2, level: 3 },
    { id: "sc-ivers", name: "Gus Ivers", role: "Strength Coach", rarity: "common", base_power: 50, power_per_level: 5, unlock_shards: 10, star_shards: 10, max_stars: 5, max_level: 20, lean: "everything", shards: 12, stars: 1, level: 1 },
  ],
};

import type { LeagueViewProps } from "@/components/league-view";
import type { NationViewProps } from "@/components/nation-view";

export const sampleLeague: LeagueViewProps = {
  leagueLabel: "SEC League 1",
  seasonLabel: "2026 · Week 13",
  weekKind: "rivalry",
  myFactionId: "tx",
  houseCount: 12,
  standings: [
    { faction_id: "ou", name: teamName(OU), school_id: "oklahoma", wins: 14, losses: 6, points: 52, members: 9, is_mine: false },
    { faction_id: "tx", name: teamName(TX), school_id: "texas", wins: 15, losses: 9, points: 51, members: 12, is_mine: true },
    { faction_id: "al", name: teamName(AL), school_id: "alabama", wins: 7, losses: 5, points: 26, members: 4, is_mine: false },
    { faction_id: "ga", name: teamName(GA), school_id: "georgia", wins: 2, losses: 4, points: 10, members: 2, is_mine: false },
  ],
  games: [
    { id: "1", kind: "rivalry", status: "resolved", locks_at: new Date(now - 3600e3).toISOString(), home_name: teamName(TX), home_is_house: false, home_faction_id: "tx", away_name: teamName(OU), away_is_house: false, away_faction_id: "ou", home_score: 31, away_score: 27, narrative: null, mine: true },
    { id: "2", kind: "rivalry", status: "resolved", locks_at: new Date(now - 3600e3).toISOString(), home_name: teamName(OU), home_is_house: false, home_faction_id: "ou", away_name: teamName(TX), away_is_house: false, away_faction_id: "tx", home_score: 20, away_score: 24, narrative: null, mine: true },
    { id: "3", kind: "rivalry", status: "scheduled", locks_at: new Date(now + 20 * 60e3).toISOString(), home_name: teamName(TX), home_is_house: false, home_faction_id: "tx", away_name: teamName(OU), away_is_house: true, away_faction_id: null, home_score: null, away_score: null, narrative: null, mine: true },
    { id: "4", kind: "rivalry", status: "resolved", locks_at: new Date(now - 3600e3).toISOString(), home_name: teamName(AL), home_is_house: false, home_faction_id: "al", away_name: teamName(AU), away_is_house: true, away_faction_id: null, home_score: 17, away_score: 21, narrative: null, mine: false },
  ],
  bracket: [
    { a: teamName(OU), b: teamName(TX), a_points: 4, b_points: 6, games: 3, resolved: 2, a_mine: false, b_mine: true },
    { a: teamName(AL), b: teamName(AU), a_points: 1, b_points: 0, games: 1, resolved: 1, a_mine: false, b_mine: false },
  ],
  trophies: [{ week_number: 13, faction: teamName(TX), opponent: teamName(OU), faction_points: 8, opponent_points: 4, mine: true }],
};

export const sampleNation: NationViewProps = {
  seasonLabel: "2026 · Week 13",
  mySchool: shortName(TX),
  rival: { name: shortName(OU), myPoints: 412, rivalPoints: 377, myWins: 118, rivalWins: 104 },
  rows: [
    { school_id: "georgia", name: shortName(GA), conference: "SEC", wins: 140, losses: 61, points: 481, mine: false },
    { school_id: "texas", name: shortName(TX), conference: "SEC", wins: 118, losses: 58, points: 412, mine: true },
    { school_id: "ohio-state", name: shortName(OSU), conference: "Big Ten", wins: 110, losses: 70, points: 400, mine: false },
    { school_id: "oklahoma", name: shortName(OU), conference: "SEC", wins: 104, losses: 65, points: 377, mine: false },
    { school_id: "michigan", name: shortName(MI), conference: "Big Ten", wins: 90, losses: 80, points: 350, mine: false },
  ],
};
