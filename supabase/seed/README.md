# Seed data

Reference data for Phase 1. Edit the CSVs, regenerate `seed.sql`, apply it.

```
python3 supabase/seed/build.py > supabase/seed/seed.sql
```

## Provenance and caveats

- `conferences.csv`, `schools.csv`: the 138 FBS programs for the 2026 season,
  after the July 1, 2026 realignment (Pac-12 rebuilt at 8, Mountain West at 10
  with North Dakota State, UTEP and Northern Illinois, Conference USA at 10,
  Sun Belt swaps Texas State for Louisiana Tech, MAC swaps Northern Illinois
  for Sacramento State). Assembled from public realignment reporting on
  2026-09-30. **Verify against each conference's official site before launch.**
- School names and nicknames are used as plain reference data. No colors,
  marks, or mascot art are stored; those are a licensing question
  (`CLAUDE.md` §4).
- `rivalries.csv`: directional, rank 1 is primary. Assembled from common
  knowledge of the sport. Some Group of Five pairings are best guesses and
  North Dakota State has none. **The founder should review this file**; it
  drives League placement.
- The 2026 calendar is the game's calendar: weeks 0-3 non-conference, 4-12
  conference, 13 Rivalry Week, 14 championship. Real schedules mix these; the
  game does not need to.

## Phase 3 additions

- `facility_facets.csv`: how each facility's power splits across rushing,
  passing, run defense, pass defense. Rows sum to 1.
- `emphases.csv`: the six weekly emphasis choices and their multipliers.
- `staff.csv`: the assistant staff catalog. **All names are fictional.**
  Never add a real coach's name (`CLAUDE.md` §3.6).
