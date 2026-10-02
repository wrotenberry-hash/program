# Rivalry Week beta plan

Decided 2026-10-02. A few hundred invited fans from two or three rival
schools play from Rivalry Week, which starts 2026-11-28. Adults only.
Public soft launch at the start of the 2027 season.

## What the beta has to prove

1. A new fan understands the game and wants to come back within five
   minutes.
2. Fans return: we measure the share who come back on day 1, day 7, and for
   Rivalry Week.
3. Fans bring fans: invites from inside a faction.

## What gets built (behind flags, in this order)

| Week of | Build | Founder input |
|---|---|---|
| Oct 2 | Done: return-visit tracking, 18+ signup check, illustrator brief, all 18 building illustrations (made with ChatGPT), the campus home screen, guided first missions. All behind switches. | Start the attorney call. |
| Oct 9 | Campus ground art from ChatGPT fitted in. Act on test-week feedback (report Oct 8). | Decisions in the Oct 8 report. |
| Oct 16 | Game day v2: design first, then a box score and key moments. More pre-game choices only if the design is approved. | Approve the game day design. Attorney answer on school names. |
| Oct 23 | Longer progression (more levels and coaches). Invite links and share cards. | Approve turning on daily rewards, faction goals, season prizes. |
| Oct 30 | Notifications (email and browser, opt-in). Chat report and mute. Google sign-in. | Approve the email/push sending service. Google sign-in keys. |
| Nov 6 | Privacy policy and terms pages. Art arrives and goes in. Both light and dark checked on every screen. | Policy and terms text (attorney or template service). |
| Nov 13 | Readiness check, load test, first 20 to 50 invites. Season rollover target met (Nov 15). | Pick the beta schools and line up fans. |
| Nov 20 | Fixes from the first invites. Full invites go out. | Send invites. |
| Nov 28 | Rivalry Week. Beta live. | |

## Founder tasks outside the code

- **Attorney call** (by Oct 16): can an invite-only beta use real school
  names, and what does a public launch need? Everything public waits on this.
- **Illustrator** (hired by Oct 16, art by Nov 6): brief in
  `docs/art-brief.md`.
- **Supabase settings** (any time before Nov 13): Site URL and redirect URLs,
  leaked-password protection, Google provider keys.
- **Privacy policy and terms** (by Nov 6).
- **Beta schools and fans** (by Nov 13): two or three rival schools whose fans
  you can reach, ideally ones playing each other on Rivalry Week.

## Not in the beta

Payments, native app, real-results feed, the map and long-session play,
offseason content. Revisit after the beta numbers are in.
