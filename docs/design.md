# Design

The visual spec. Every value here is literal. A product designer will replace
the art and may replace this palette; until then, this is the law.

## Register

Colorful cartoon mobile game. Think Last War: deep navy space behind bright,
chunky, rounded panels; gold for money and rewards; green for "go"; a warm
orange glow for power. Nothing flat, nothing gray, nothing that reads as a
form. Every screen has at least one glowing button that wants to be tapped.

## Palette

Tokens live on `:root` in `app/globals.css` and map to Tailwind colors.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0B1230` | `#E9F0FF` | Page background, top of gradient |
| `--bg-2` | `#151E4A` | `#F7FAFF` | Page background, bottom of gradient |
| `--surface` | `#1A2454` | `#FFFFFF` | Panels |
| `--surface-2` | `#222F6B` | `#EEF3FF` | Nested panels, tiles |
| `--ink` | `#F5F7FF` | `#121A3A` | Text |
| `--ink-muted` | `#A9B4E3` | `#5B6693` | Secondary text |
| `--line` | `#2E3C82` | `#CFD9F6` | Borders |
| `--primary` | `#3E7BFF` | `#2F6BFF` | Primary actions |
| `--primary-ink` | `#FFFFFF` | `#FFFFFF` | Text on primary |
| `--gold` | `#FFC94A` | `#FFB300` | Currency, rewards, collect |
| `--gold-ink` | `#3A2600` | `#3A2600` | Text on gold |
| `--go` | `#3DDC84` | `#1FB864` | Claim, ready, success |
| `--go-ink` | `#04260F` | `#FFFFFF` | Text on go |
| `--power` | `#FF7A1A` | `#F26A00` | Power number and glow |
| `--faction` | `#A78BFA` | `#7C5CE6` | Faction accents |
| `--danger` | `#FF5A5F` | `#E0343A` | Errors only |

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

## Rules

- Light mode is real. Both modes are checked on every screen.
- One glowing button per screen at most; the most valuable tap gets it.
- Red is for errors. Never for accents or hover.
