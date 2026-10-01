import { Button, Card } from "@/components/ui";
import { Check, Coin, Trophy } from "@/components/icons";
import { formatCash } from "@/lib/format";

/** Shape of faction_goal_status() (supabase/migrations/0019_faction_goals.sql). */
export type FactionGoalStatus = {
  enabled: boolean;
  seated: boolean;
  role?: string;
  can_set?: boolean;
  officers?: number;
  officer_cap?: number;
  members?: number;
  week?: { season_id: string; week_number: number } | null;
  goal?: { type_id: string; label: string; blurb: string; target: number; reward: number; progress: number; met: boolean; claimed: boolean; locked: boolean } | null;
  types?: { id: string; label: string; blurb: string; reward: number; target: number }[];
};

type Action = (formData: FormData) => void | Promise<void>;

function GoalOptions({ status, setGoal, currentId }: { status: FactionGoalStatus; setGoal: Action; currentId?: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {(status.types ?? [])
        .filter((t) => t.id !== currentId)
        .map((t) => (
          <li key={t.id}>
            <form action={setGoal}>
              <input type="hidden" name="goal_type_id" value={t.id} />
              <button type="submit" className="btn-3d w-full rounded-2xl border border-line bg-surface-2 px-3 py-2 text-left [--btn-edge:var(--line)]">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black">
                    {t.label} · <span className="tabular-nums">{t.target}</span>
                  </span>
                  <span className="text-xs font-extrabold tabular-nums text-gold">+{formatCash(t.reward)} each</span>
                </span>
                <span className="mt-0.5 block text-xs font-semibold text-ink-muted">{t.blurb}</span>
              </button>
            </form>
          </li>
        ))}
    </ul>
  );
}

export function FactionGoalCard({ status, setGoal, claimGoal }: { status: FactionGoalStatus; setGoal: Action; claimGoal: Action }) {
  const goal = status.goal;
  const pct = goal ? Math.min(100, Math.round((goal.progress / goal.target) * 100)) : 0;

  return (
    <Card
      title="Weekly goal"
      accent="gold"
      icon={<Trophy size={14} />}
      action={status.week ? <span className="text-xs font-extrabold text-ink-muted">Week {status.week.week_number}</span> : null}
    >
      {!status.week ? (
        <p className="text-sm font-semibold">Goals come back when the season starts.</p>
      ) : goal ? (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-lg font-black">{goal.label}</p>
            <p className="text-lg font-black tabular-nums">
              {Math.min(goal.progress, goal.target)}/{goal.target}
            </p>
          </div>
          <p className="text-xs font-semibold text-ink-muted">{goal.blurb}</p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={goal.progress} aria-valuemin={0} aria-valuemax={goal.target}>
            <div className={`h-full rounded-full ${goal.met ? "bg-go" : "bg-gold"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3">
            {goal.claimed ? (
              <p className="inline-flex items-center gap-1 text-sm font-extrabold text-go">
                <Check size={18} /> Reward claimed
              </p>
            ) : goal.met ? (
              <form action={claimGoal}>
                <Button type="submit" variant="go" pulse>
                  <Coin size={20} /> Claim +{formatCash(goal.reward)}
                </Button>
              </form>
            ) : (
              <p className="text-sm font-semibold">
                Everyone in the faction gets <span className="font-black tabular-nums text-gold">+{formatCash(goal.reward)}</span> when it&apos;s done.
              </p>
            )}
          </div>
          {status.can_set && !goal.locked ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-extrabold text-ink-muted">Change the goal (locks once anyone makes progress)</summary>
              <div className="mt-2">
                <GoalOptions status={status} setGoal={setGoal} currentId={goal.type_id} />
              </div>
            </details>
          ) : null}
        </>
      ) : status.can_set ? (
        <>
          <p className="mb-2 text-sm font-semibold">Pick this week&apos;s goal. Everyone shares the reward.</p>
          <GoalOptions status={status} setGoal={setGoal} />
        </>
      ) : (
        <p className="text-sm font-semibold">No goal yet. Your founder or an officer picks one each week.</p>
      )}
    </Card>
  );
}
