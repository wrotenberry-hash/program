# Design

The visual spec. Every value here is literal. A product designer will replace
the art and may replace this palette; until then, this is the law.

## Register

Colorful cartoon mobile game. Think Last War's chunky, rounded panels and
glowing buttons, on a bright sky-blue backdrop: gold for money and rewards;
green for "go"; a warm orange glow for power. Nothing flat, nothing gray, nothing that reads as a
form. Every screen has at least one glowing button that wants to be tapped.

## Palette

Tokens live on `:root` in `app/globals.css` and map to Tailwind colors.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#E9F0FF` | Page background, top of gradient |
| `--bg-2` | `#F7FAFF` | Page background, bottom of gradient |
| `--surface` | `#FFFFFF` | Panels |
| `--surface-2` | `#EEF3FF` | Nested panels, tiles |
| `--ink` | `#121A3A` | Text |
| `--ink-muted` | `#5B6693` | Secondary text |
| `--line` | `#CFD9F6` | Borders |
| `--primary` | `#2F6BFF` | Primary actions |
| `--primary-ink` | `#FFFFFF` | Text on primary |
| `--gold` | `#FFB300` | Currency, rewards, collect |
| `--gold-ink` | `#3A2600` | Text on gold |
| `--go` | `#1FB864` | Claim, ready, success |
| `--go-ink` | `#FFFFFF` | Text on go |
| `--power` | `#F26A00` | Power number and glow |
| `--faction` | `#7C5CE6` | Faction accents |
| `--danger` | `#E0343A` | Errors only |

## Type

Rounded, heavy display: `ui-rounded, "SF Pro Rounded", "Nunito", system-ui`.
Headings weight 900. Numbers are `tabular-nums` everywhere. Power is the
largest number on any screen it appears on.

## Shapes and depth

- Panels: `rounded-3xl`, 1px border in `--line`, soft drop shadow, gradient
  header stripe in the panel's accent.
- Buttons: `rounded-2xl`, height 52px, weight 800, a bottom edge 4px darker
  than the face so they read as pressable. `active:` translates 2px down and
  the edge collapses.
- Chips and badges: `rounded-full`, uppercase, tracking-wide.

## Motion

- Collect and claim buttons pulse (scale 1 to 1.03, glow) while there is
  something to take. They stop when there is not.
- Every tap scales the target to 0.97 on press.
- `prefers-reduced-motion` disables the pulse and keeps the press.

## Icons

Inline SVG only, single color, drawn from the token of the thing they mark
(gold coin for budget, orange bolt for power, purple shield for faction).
No emoji. No icon fonts. No external image hosts.

## Campus home

The founder-approved target is `docs/mockups/home-target-2026-10-02.png`
(made with ChatGPT; its text is placeholder). Everything floating over the
campus uses navy glass with a thin gold rim (`.navy-glass`): resources,
round buttons, nameplates, the mission strip. Gold is `#D6B15C` for rims and
`#F6DD94` for gold text. White type with a soft shadow (`.game-text`), never
a thick cartoon outline. Green (`#2FBF6F` to `#0B6A36`) only for go actions:
Matchups, Claim, Ready. The other app screens keep the light look.

## Rules

- One look for everyone: light, whatever the phone is set to. There is no
  dark mode (founder decision, 2026-10-02).
- One glowing button per screen at most; the most valuable tap gets it.
- Red is for errors. Never for accents or hover.
