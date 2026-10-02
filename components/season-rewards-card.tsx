import { Button, Card } from "@/components/ui";
import { Coin, Trophy } from "@/components/icons";
import { formatCash } from "@/lib/format";

/** Shape of season_rewards_status() (supabase/migrations/0020_season_rewards.sql). */
export type SeasonRewardsStatus = {
  enabled: boolean;
  unclaimed: {
    season_id: string;
    year: number;
    place: number | null;
    league_size: number;
    games_played: number;
    place_cash: number;
    played_cash: number;
    min_games: number;
  }[];
};

type Action = (formData: FormData) => void | Promise<void>;

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}

export function SeasonRewardsCard({ status, claim }: { status: SeasonRewardsStatus; claim: Action }) {
  const total = status.unclaimed.reduce((n, r) => n + r.place_cash + r.played_cash, 0);
  return (
    <Card title="Season rewards" accent="gold" icon={<Trophy size={14} />}>
      <ul className="flex flex-col gap-2">
        {status.unclaimed.map((r) => (
          <li key={r.season_id} className="rounded-2xl bg-surface-2 px-3 py-2">
            <p className="text-base font-black">
              {r.year} season
              {r.place ? (
                <span className="text-gold">
                  {" "}
                  · {r.place === 1 ? "League champions!" : `${ordinal(r.place)} of ${r.league_size}`}
                </span>
              ) : null}
            </p>
            <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 text-sm font-semibold tabular-nums">
              {r.place_cash > 0 ? (
                <>
                  <dt>Faction finished {ordinal(r.place ?? 0)}</dt>
                  <dd className="text-right font-black text-gold">+{formatCash(r.place_cash)}</dd>
                </>
              ) : null}
              {r.played_cash > 0 ? (
                <>
                  <dt>
                    Played {r.games_played} League games
                  </dt>
                  <dd className="text-right font-black text-gold">+{formatCash(r.played_cash)}</dd>
                </>
              ) : null}
            </dl>
          </li>
        ))}
      </ul>
      <form action={claim} className="mt-3">
        <Button type="submit" variant="gold" pulse>
          <Coin size={20} /> Claim {formatCash(total)}
        </Button>
      </form>
    </Card>
  );
}
