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
