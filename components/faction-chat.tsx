"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { postMessage } from "@/app/faction/actions";

export type ChatMessage = { id: number; program_id: string; body: string; created_at: string };

/**
 * Faction chat. Server renders the recent history; this subscribes to new
 * rows over Realtime. RLS limits the stream to the caller's own faction.
 */
export function FactionChat({
  factionId,
  initial,
  names,
  myProgramId,
}: {
  factionId: string;
  initial: ChatMessage[];
  names: Record<string, string>;
  myProgramId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`faction:${factionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "faction_messages", filter: `faction_id=eq.${factionId}` },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [factionId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface-2">
      <div ref={listRef} className="flex max-h-[50dvh] min-h-48 flex-col gap-2 overflow-y-auto p-3">
        {messages.length === 0 ? <p className="text-sm font-semibold text-ink-muted">Quiet so far. Say something to your people.</p> : null}
        {messages.map((m) => {
          const mine = m.program_id === myProgramId;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <span className="text-[11px] text-ink-muted">{mine ? "You" : (names[m.program_id] ?? "Fan")}</span>
              <span className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm font-semibold ${mine ? "bg-faction text-white" : "bg-surface text-ink"}`}>{m.body}</span>
            </div>
          );
        })}
      </div>
      <form
        ref={formRef}
        action={async (fd) => {
          const optimistic: ChatMessage = { id: -Date.now(), program_id: myProgramId, body: String(fd.get("body") ?? ""), created_at: new Date().toISOString() };
          if (!optimistic.body.trim()) return;
          setMessages((prev) => [...prev, optimistic]);
          setDraft("");
          await postMessage(fd);
        }}
        className="flex gap-2 border-t border-line p-2"
      >
        <input type="hidden" name="faction_id" value={factionId} />
        <input
          name="body"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder="Message your faction"
          autoComplete="off"
          className="h-11 flex-1 rounded-xl border-2 border-line bg-surface px-3 text-base font-semibold text-ink outline-none focus:border-faction"
        />
        <button type="submit" className="btn-3d h-11 rounded-xl bg-faction px-4 text-sm font-extrabold text-white [--btn-edge:#5a3fc0]" disabled={!draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
