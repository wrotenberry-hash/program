import Link from "next/link";
import { Card, Notice, Wordmark } from "@/components/ui";
import { Chat, Shield, Trophy } from "@/components/icons";
import { FactionChat, type ChatMessage } from "@/components/faction-chat";
import { timeAgo } from "@/lib/format";

export type RosterRow = { program_id: string; display_name: string; role: string; last_active_at: string; is_me: boolean };

export type FactionViewProps = {
  leagueLabel: string;
  factionName: string;
  role: string;
  cap: number;
  members: RosterRow[];
  messages: ChatMessage[];
  myProgramId: string;
  factionId: string;
  leagueSchools: { school_id: string; name: string }[];
  conferenceSize: number;
  error?: string;
};

export function FactionView(p: FactionViewProps) {
  const names: Record<string, string> = Object.fromEntries(p.members.map((m) => [m.program_id, m.display_name]));
  return (
    <main className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between py-1">
        <Wordmark />
        <Link href="/program" className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-extrabold">
          ← Program
        </Link>
      </header>

      <section className="panel relative overflow-hidden rounded-3xl border border-line bg-surface p-5">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-faction/30 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-faction">{p.leagueLabel}</p>
          <h1 className="mt-0.5 flex items-center gap-2 text-[2rem] font-black leading-[1.05] tracking-tight">
            <Shield size={30} className="text-faction" /> {p.factionName}
          </h1>
          <p className="mt-1 text-sm font-semibold text-ink-muted">
            {p.members.length} of {p.cap} fans · {p.role === "leader" ? "You founded this faction" : "Member"}
          </p>
        </div>
      </section>

      {p.error ? <Notice tone="error">{p.error}</Notice> : null}

      <Card title="Chat" accent="faction" icon={<Chat size={14} />}>
        <FactionChat factionId={p.factionId} initial={p.messages} names={names} myProgramId={p.myProgramId} />
      </Card>

      <Card title="Roster" accent="primary" icon={<Shield size={14} />}>
        <ul className="flex flex-col gap-2">
          {p.members.map((m) => (
            <li key={m.program_id} className="flex items-center justify-between rounded-2xl bg-surface-2 px-3 py-2">
              <div>
                <p className="text-sm font-black">
                  {m.display_name}
                  {m.is_me ? <span className="ml-1 text-xs font-bold text-ink-muted">(you)</span> : null}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-faction">{m.role === "leader" ? "Founder" : m.role === "officer" ? "Officer" : "Member"}</p>
              </div>
              <span className="text-xs font-bold text-ink-muted">{timeAgo(m.last_active_at)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="This League" accent="go" icon={<Trophy size={14} />}>
        <p className="text-sm font-semibold">
          {p.leagueSchools.length} of {p.conferenceSize} schools have fans here. The rest are run by the house until their fans show up.
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {p.leagueSchools.map((f) => (
            <li key={f.school_id} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-extrabold">
              {f.name}
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
