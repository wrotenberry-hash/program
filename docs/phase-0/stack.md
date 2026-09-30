# Stack proposal

Phase 0 design. Status: **approved by the founder, 2026-09-30: web-first,
mobile-first, as proposed.** Code may begin in Phase 1.

---

## 1. The one honest tension

Last War and its peers are native mobile games built in Unity or Cocos, with
an art and animation pipeline that a web stack will not match. This proposal
does not try to match it. It optimizes for one thing: getting two friends to
the slice as fast as possible with the tools the founder already runs, so the
loop can be judged before the polish is paid for.

The bet is that the loop (build a program, join a faction, meet a rival in a
sim) can be proven on the web, and that the client can be rebuilt natively
later without touching the server, the sim, or the data. Everything below is
arranged so that the client is the disposable layer.

If the founder would rather start native, this proposal changes completely
and the slice moves out by months. That is the decision to make now.

## 2. Proposed stack

| Layer | Choice | Why |
|---|---|---|
| Client | Next.js 15, App Router, mobile-first web app installable as a PWA | The founder's existing stack. Runs on any phone with no app-store step, which the slice needs. Replaceable later. |
| Language | TypeScript, strict mode | Shared between client, server, and sim. No `any` without a comment. |
| Database | Supabase Postgres | Existing stack. RLS on every table before it holds data. `league_id` on every League-scoped table. |
| Auth | Supabase Auth: email and Google | Existing stack. Apple sign-in is added when a native client exists. Date of birth is collected at signup for the age gate. |
| Realtime | Supabase Realtime | Faction chat and League event feeds. Channel per faction and per League. |
| Matchup resolver | A pure TypeScript package, `packages/sim`, deterministic and seeded | Not a game simulation (decided 2026-09-30): it takes two programs' facet powers and a seed and returns a score, facet results, and a narrative. No I/O, so it is testable, replayable for support, and portable to a native client. |
| Sim scheduler | Vercel Cron calling a server route that resolves one League-week at a time, queued in a Postgres table | A game resolves in milliseconds. A full League-week is under a thousand games. No queue service is needed for the slice. |
| Styling | Tailwind CSS | Existing stack. |
| Art | Placeholder only, in `public/placeholder/` | A product designer owns the final UI. Placeholders are named for their final purpose so they can be swapped one for one. |
| Hosting | Vercel, preview deploy per branch | Existing stack. |
| Payments | Deferred. Not in the slice. | See §5. |

Nothing else. No ORM, no state library, no component kit, no game engine.
Adding one is an escalation.

## 3. Why the sim is a separate package

The sim is the product's integrity. `CONTEXT.md` requires it to be
server-side, pre-game only, and sealed from real-world results. Keeping it as
a pure function with no database access makes those rules structural:

- It cannot read real-world results because it cannot read anything. Its
  inputs are handed to it by the scheduler.
- It cannot be influenced live because it runs once, after the pre-game
  window closes, with inputs frozen at that moment.
- Every game stores its seed and its frozen inputs. Support can replay any
  game and get the same box score. That is also the audit trail if a
  monetization dispute ever asks whether money changed a result.

The box score, narrative, and key moments are all derived from the same
resolved event log, so they never disagree with each other.

## 4. Sharding in this stack

The sharding design (`sharding-and-rivalry.md`) makes the League the
partition. In this stack that is a column, not infrastructure:

- Every League-scoped table carries `league_id` and an index on it.
- RLS policies scope reads to the caller's own Leagues for chat and events,
  and to public columns for standings.
- The scheduler processes one League-week per invocation, so Leagues are
  already independent units of work. Moving them to separate databases later
  is an operational change, not a rewrite.

The slice needs two Leagues. This stack handles hundreds without change.
Thousands is a Phase 3 question.

## 5. Monetization, deliberately out of the slice

The layer is config-driven and flag-gated (`CLAUDE.md` §3.5). The slice
ships with the config tables and the flag, and nothing purchasable. Two
reasons:

1. The slice tests the loop, not the spend. Payments add a week and prove
   nothing about whether two friends want to meet in a rivalry game.
2. The payment rail is itself a founder decision. Web payments through Stripe
   avoid the app-store cut but are awkward on a phone. Native store billing
   is what the whale model expects and requires a native client. That choice
   is best made after the slice, with a real signal.

What the slice does ship: the `purchasables` and `drop_tables` config
tables, empty; the `monetization_enabled` flag, off; the date-of-birth
column and `is_minor` derivation for the age gate; and a stub odds-disclosure
screen that renders any drop table it is given. The hooks exist on day one.
Nothing sells.

## 6. What this stack is bad at, stated plainly

- **Animation and feel.** A web client will not have the juice of a native
  gacha game. The slice will look like a well-made web app with placeholder
  art. That is acceptable for judging the loop and unacceptable for launch.
- **Push notifications.** Web push works on modern phones but is
  second-class on iOS. The five-minute check-in loop leans on notifications,
  so a native client is on the path to launch regardless.
- **Long-running jobs.** Vercel functions have execution limits. The sim
  scheduler is built to do small units of work per call to stay inside them.
  If a League-week ever exceeds a call, the queue table already lets it
  resume.

## 7. Repository layout once code exists

```
/app              Next.js App Router
/components       Shared UI
/lib              Supabase clients, flags, config loaders
/packages/sim     The simulation. Pure TypeScript, no I/O, its own tests
/supabase
  /migrations     SQL migrations, ordered
  /seed           Schools, conferences, rivalry pairings, calendar
/docs             Design documents
/public/placeholder   Placeholder art
```

## 8. Decision

**Web-first, mobile-first, as proposed.** Decided by the founder on
2026-09-30. The next step is Phase 1 in `docs/roadmap.md`. A native client
remains on the after-the-slice list.
