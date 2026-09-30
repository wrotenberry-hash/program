export const FACETS = [
  { key: "rushing", label: "Rushing", short: "RUSH" },
  { key: "passing", label: "Passing", short: "PASS" },
  { key: "run_defense", label: "Run defense", short: "RUN D" },
  { key: "pass_defense", label: "Pass defense", short: "PASS D" },
] as const;
export type FacetKey = (typeof FACETS)[number]["key"];
export type FacetSet = Record<FacetKey, number>;

export type GameInputs = {
  home: { program_id: string; name: string; emphasis: string; total: number } & FacetSet;
  away: { program_id: string; name: string; emphasis: string; total: number } & FacetSet;
};
export type GameResult = {
  home_score: number;
  away_score: number;
  winner_program_id: string;
  edges: { home_rush: number; home_pass: number; away_rush: number; away_pass: number };
  decisive: string;
  narrative: string;
};
