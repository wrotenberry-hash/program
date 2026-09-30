import type { ProgramViewProps } from "@/components/program-view";
import type { FactionViewProps } from "@/components/faction-view";

import { noop } from "@/app/preview/actions";
const now = Date.now();

export const sampleProgram: Omit<ProgramViewProps, "actions"> = {
  displayName: "Wilson",
  programName: "Texas Longhorns",
  school: { name: "Texas", full_name: "University of Texas at Austin", city: "Austin", state: "TX" },
  conferenceShort: "SEC",
  seasonLabel: "2026 · Week 4",
  seat: { factionName: "Texas Longhorns", leagueLabel: "SEC League 1", role: "leader" },
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

export const sampleActions: ProgramViewProps["actions"] = { joinFaction: noop, collectIncome: noop, startUpgrade: noop, claimUpgrade: noop, signOut: noop };

export const sampleFaction: FactionViewProps = {
  leagueLabel: "SEC League 1",
  factionName: "Texas Longhorns",
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
    { school_id: "texas", name: "Texas" },
    { school_id: "oklahoma", name: "Oklahoma" },
    { school_id: "alabama", name: "Alabama" },
  ],
  conferenceSize: 16,
};

import type { MatchupsViewProps } from "@/components/matchups-view";
import type { StaffViewProps } from "@/components/staff-view";

export const sampleMatchups: Omit<MatchupsViewProps, "actions"> = {
  myProgramId: "me",
  myName: "Texas Longhorns",
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
    { id: "g1", status: "scheduled", locks_at: new Date(now + 4 * 60e3).toISOString(), week_number: 4, home_program_id: "me", away_program_id: "ou", inputs: null, result: null, home_name: "Texas Longhorns", away_name: "Oklahoma Sooners" },
    {
      id: "g2", status: "resolved", locks_at: new Date(now - 3600e3).toISOString(), week_number: 4, home_program_id: "mi", away_program_id: "me",
      inputs: { home: { program_id: "mi", name: "Michigan Wolverines", emphasis: "ground-and-pound", total: 790, rushing: 260, passing: 160, run_defense: 190, pass_defense: 180 }, away: { program_id: "me", name: "Texas Longhorns", emphasis: "air-raid", total: 860, rushing: 180, passing: 265, run_defense: 210, pass_defense: 205 } },
      result: { home_score: 24, away_score: 31, winner_program_id: "me", edges: { home_rush: 0.11, home_pass: -0.12, away_rush: -0.03, away_pass: 0.19 }, decisive: "away_pass", narrative: "Texas Longhorns beat Michigan Wolverines 31–24. Texas Longhorns threw it all over Michigan Wolverines's secondary." },
      home_name: "Michigan Wolverines", away_name: "Texas Longhorns",
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
