import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { Check, Coin } from "@/components/icons";
import { formatCash } from "@/lib/format";

/** Shape of daily_status() (supabase/migrations/0018_daily_rewards.sql). */
export type DailyStatus = {
  enabled: boolean;
  day: string;
  checkin: { claimed: boolean; streak: number; reward: number; ladder: number[] };
  tasks: { id: string; label: string; reward: number; done: boolean; claimed: boolean }[];
};

type Action = (formData: FormData) => void | Promise<void>;

/** Where each task gets done, so an unfinished one is one tap away. */
const taskHref: Record<string, string> = { scout: "/staff", challenge: "/matchups", chat: "/faction" };

export function DailyCard({ daily, claimCheckin, claimTask }: { daily: DailyStatus; claimCheckin: Action; claimTask: Action }) {
  const { checkin, tasks } = daily;
  const ladder = checkin.ladder.length ? checkin.ladder : [checkin.reward];
  const pos = (checkin.streak - 1) % ladder.length;
  const left = tasks.filter((t) => !t.claimed).length;

  return (
    <Card
      title="Daily"
      accent="gold"
      icon={<Coin size={14} />}
      action={<span className="text-xs font-extrabold text-ink-muted">{left === 0 && checkin.claimed ? "All done today" : `${left} of ${tasks.length} left`}</span>}
    >
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${ladder.length}, minmax(0, 1fr))` }} aria-label="Check-in streak">
        {ladder.map((r, i) => {
          const got = i < pos || (i === pos && checkin.claimed);
          const today = i === pos && !checkin.claimed;
          return (
            <li
              key={i}
              className={`flex flex-col items-center rounded-xl border py-1.5 text-[11px] font-extrabold tabular-nums ${
                got ? "border-gold bg-gold text-gold-ink" : today ? "border-gold bg-gold/15 text-ink" : "border-line bg-surface-2 text-ink-muted"
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider opacity-80">D{i + 1}</span>
              {got ? <Check size={14} /> : <span>{r}</span>}
            </li>
          );
        })}
      </ol>
      <form action={claimCheckin} className="mt-3">
        <Button type="submit" variant={checkin.claimed ? "secondary" : "gold"} pulse={!checkin.claimed} disabled={checkin.claimed}>
          <Coin size={20} />
          {checkin.claimed ? `Checked in · ${checkin.streak}-day streak` : `Check in · +${formatCash(checkin.reward)}`}
        </Button>
      </form>

      <ul className="mt-3 flex flex-col gap-2">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-3 py-2">
            <div className="min-w-0">
              <p className={`truncate text-sm font-black ${t.claimed ? "text-ink-muted line-through" : ""}`}>{t.label}</p>
              <p className="text-xs font-extrabold tabular-nums text-gold">+{formatCash(t.reward)}</p>
            </div>
            {t.claimed ? (
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-go">
                <Check size={16} /> Done
              </span>
            ) : t.done ? (
              <form action={claimTask}>
                <input type="hidden" name="task_id" value={t.id} />
                <Button type="submit" variant="go" className="h-10 w-auto px-4 text-sm">
                  Claim
                </Button>
              </form>
            ) : taskHref[t.id] ? (
              <Link href={taskHref[t.id]} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-extrabold">
                Go →
              </Link>
            ) : (
              <span className="text-xs font-bold text-ink-muted">To do</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs font-semibold text-ink-muted">Miss a day and the streak starts over. New tasks every morning.</p>
    </Card>
  );
}
