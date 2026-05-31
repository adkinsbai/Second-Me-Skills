"use client";

import { useState } from "react";

const REACTION_EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

export type ReactionMap = Record<string, string[]>; // emoji -> userId[]

export function ReactionPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute -top-12 left-1/2 z-30 flex -translate-x-1/2 gap-1 rounded-2xl border-2 border-[var(--ink)] bg-[#FFFDF2] px-2 py-1.5 shadow-[4px_4px_0_var(--ink)]"
      onMouseLeave={onClose}
    >
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:scale-125 hover:bg-[var(--brand)]"
          aria-label={`回应 ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function ReactionBadges({
  reactions,
  currentUserId,
  onToggle,
}: {
  reactions: ReactionMap;
  currentUserId?: string;
  onToggle?: (emoji: string) => void;
}) {
  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0);
  if (entries.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {entries.map(([emoji, users]) => {
        const reacted = currentUserId ? users.includes(currentUserId) : false;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle?.(emoji)}
            className={`flex items-center gap-0.5 rounded-full border-2 border-[var(--ink)] px-1.5 py-0.5 text-xs font-bold shadow-[2px_2px_0_var(--ink)] transition hover:-translate-y-0.5 ${
              reacted ? "bg-[var(--brand)]" : "bg-[#FFFDF2]"
            }`}
          >
            <span>{emoji}</span>
            {users.length > 1 && <span className="text-[10px]">{users.length}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Client-side reaction storage using localStorage (legacy fallback).
 * Key: `reactions_${matchId}` -> Record<messageId, ReactionMap>
 */
export function loadReactions(matchId: string): Record<string, ReactionMap> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`reactions_${matchId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveReactions(matchId: string, data: Record<string, ReactionMap>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`reactions_${matchId}`, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * Server-side reaction fetch — loads reactions from the database via API.
 * Returns Record<messageId, ReactionMap>.
 */
export async function fetchReactions(matchId: string): Promise<Record<string, ReactionMap>> {
  try {
    const res = await fetch(`/api/matches/${matchId}/reactions`, { credentials: "include" });
    const json = await res.json().catch(() => null);
    if (json?.code === 0 && json.data) return json.data as Record<string, ReactionMap>;
  } catch {
    // fall through
  }
  return {};
}

/**
 * Server-side reaction toggle — sends a reaction toggle to the API.
 * Returns the action taken: "added" or "removed".
 */
export async function toggleReactionServer(
  matchId: string,
  messageId: string,
  emoji: string
): Promise<"added" | "removed" | null> {
  try {
    const res = await fetch(`/api/matches/${matchId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ messageId, emoji }),
    });
    const json = await res.json().catch(() => null);
    if (json?.code === 0 && json.data?.action) return json.data.action as "added" | "removed";
  } catch {
    // fall through
  }
  return null;
}

export function toggleReaction(
  allReactions: Record<string, ReactionMap>,
  messageId: string,
  emoji: string,
  userId: string
): Record<string, ReactionMap> {
  const next = { ...allReactions };
  const msgReactions: ReactionMap = { ...(next[messageId] ?? {}) };
  const users = [...(msgReactions[emoji] ?? [])];
  const idx = users.indexOf(userId);
  if (idx >= 0) {
    users.splice(idx, 1);
  } else {
    users.push(userId);
  }
  if (users.length > 0) {
    msgReactions[emoji] = users;
  } else {
    delete msgReactions[emoji];
  }
  if (Object.keys(msgReactions).length > 0) {
    next[messageId] = msgReactions;
  } else {
    delete next[messageId];
  }
  return next;
}
