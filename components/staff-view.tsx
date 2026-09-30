import Link from "next/link";
import { Button, Card, Notice, Wordmark } from "@/components/ui";
import { Bolt, Coin, Shield } from "@/components/icons";
import { Countdown } from "@/components/countdown";
import { formatCash } from "@/lib/format";

export type StaffRow = {
  id: string;
  name: string;
  role: string;
  rarity: string;
  base_power: number;
  power_per_level: number;
  unlock_shards: number;
  star_shards: number;
  max_stars: number;
  max_level: number;
  lean: string;
  shards: number;
  stars: number;
  level: number;
};

export type StaffViewProps = {
  cash: number;
  nextScoutAt: string | null;
  scoutShards: number;
  levelCostBase: number;
  staff: StaffRow[];
  notice?: string;
  error?: string;
  actions: { scout: (fd: FormData) => void | Promise<void>; starUp: (fd: FormData) => void | Promise<void>; levelUp: (fd: FormData) => void | Promise<void> };
  now?: number;
};

export function staffPower(s: { stars: number; level: number; base_power: number; power_per_level: number }) {
  if (s.stars <= 0) return 0;
  return Math.round((s.base_power + s.power_per_level * (s.level - 1)) * (1 + 0.25 * (s.stars - 1)));
}

const rarityLook: Record<string, string> = {
  common: "bg-line text-ink",
  rare: "bg-primary text-primary-ink",
  epic: "bg-faction text-white",
};

export function StaffView(p: StaffViewProps) {
  const now = p.now ?? Date.now();
  const canScout = !p.nextScoutAt || new Date(p.nextScoutAt).getTime() <= now;
  const hired = p.staff.filter((s) => s.stars > 0);
  const totalStaffPower = hired.reduce((n, s) => n + staffPower(s), 0);

  return (
    <main className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between py-1">
        <Wordmark />
        <Link href="/program" className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-extrabold">
          ← Program
        </Link>
      </header>

      <section className="panel relative overflow-hidden rounded-3xl border border-line bg-surface p-5">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/25 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary">Assistant staff</p>
          <h1 className="mt-0.5 text-[2rem] font-black leading-[1.05] tracking-tight">Your coaches</h1>
          <p className="mt-1 text-sm font-semibold text-ink-muted">
            {hired.length} of {p.staff.length} hired · <span className="text-power">{totalStaffPower} power</span> from staff
          </p>
          <form action={p.actions.scout} className="mt-4">
            <Button type="submit" variant={canScout ? "gold" : "secondary"} pulse={canScout} disabled={!canScout}>
              <Shield size={18} />
              {canScout ? `Send scouts · +${p.scoutShards} shards` : <>Scouts back in <Countdown until={p.nextScoutAt!} onDoneLabel="now" /></>}
            </Button>
          </form>
          <p className="mt-2 text-xs font-semibold text-ink-muted">Scouts bring shards for one coach at a time. Enough shards hires them; more shards add stars; budget levels them up.</p>
        </div>
      </section>

      {p.error ? <Notice tone="error">{p.error}</Notice> : null}
      {p.notice ? <Notice>{p.notice}</Notice> : null}

      <Card title="Staff" accent="primary" icon={<Shield size={14} />} action={<span className="inline-flex items-center gap-1 text-xs font-extrabold text-gold"><Coin size={14} /> {formatCash(p.cash)}</span>}>
        <ul className="flex flex-col gap-2">
          {p.staff.map((s) => {
            const hiredS = s.stars > 0;
            const need = hiredS ? s.star_shards : s.unlock_shards;
            const pct = Math.min(100, Math.round((100 * s.shards) / need));
            const canStar = s.shards >= need && s.stars < s.max_stars;
            const cost = p.levelCostBase * s.level;
            const canLevel = hiredS && s.level < s.max_level && p.cash >= cost;
            const power = staffPower(s);
            return (
              <li key={s.id} className={`rounded-2xl border-2 p-3 ${hiredS ? "border-line bg-surface-2" : "border-dashed border-line bg-surface-2/60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-base font-black">
                      <span className="truncate">{s.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${rarityLook[s.rarity] ?? rarityLook.common}`}>{s.rarity}</span>
                    </p>
                    <p className="text-xs font-bold text-ink-muted">
                      {s.role} · leans {s.lean}
                    </p>
                    <p className="mt-1 text-sm font-black tracking-wider text-gold" aria-label={`${s.stars} of ${s.max_stars} stars`}>
                      {"★".repeat(s.stars)}
                      <span className="text-line">{"★".repeat(s.max_stars - s.stars)}</span>
                      {hiredS ? <span className="ml-2 text-xs font-bold text-ink-muted">Lv {s.level}</span> : null}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-power">Power</p>
                    <p className="flex items-center justify-end gap-1 text-xl font-black text-power">
                      <Bolt size={16} /> {power}
                    </p>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-ink-muted">
                    <span>{hiredS ? "Next star" : "Hire"}</span>
                    <span className="tabular-nums">
                      {s.shards}/{need} shards
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <form action={p.actions.starUp}>
                    <input type="hidden" name="staff_id" value={s.id} />
                    <Button type="submit" variant={canStar ? "gold" : "secondary"} pulse={canStar} disabled={!canStar} className="h-11 text-sm">
                      {hiredS ? (s.stars >= s.max_stars ? "Max stars" : "Add star") : "Hire"}
                    </Button>
                  </form>
                  <form action={p.actions.levelUp}>
                    <input type="hidden" name="staff_id" value={s.id} />
                    <Button type="submit" variant={canLevel ? "primary" : "secondary"} disabled={!canLevel} className="h-11 text-sm">
                      {!hiredS ? "Level" : s.level >= s.max_level ? "Max level" : <><Coin size={14} /> {formatCash(cost)}</>}
                    </Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </main>
  );
}
