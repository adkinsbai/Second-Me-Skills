"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

/* ── Types ─────────────────────────────────────────────────── */

type SearchMatch = {
  id: string;
  name: string | null;
  age: number | null;
  gender: string | null;
  bio: string | null;
  avatarUrl: string | null;
  photos: string[];
  score: number;
  reasons: string[];
  region: string | null;
};

type Message =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "ai"; content: string; matches?: SearchMatch[] };

/* ── Suggested prompts ─────────────────────────────────────── */

const SUGGESTIONS = [
  "我想找一个温柔可爱的小姐姐，喜欢读书和旅行",
  "想找同城的男生，爱运动，性格开朗",
  "25-30岁，喜欢宠物和做饭的女生",
  "想找一个有趣的灵魂，喜欢音乐和电影",
  "希望找一个上进有目标的伴侣，坐标上海",
  "想找能一起打游戏的朋友，二次元爱好者",
];

/* ── Component ─────────────────────────────────────────────── */

export default function SearchPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        "👋 你好！我是丘比AI搜索助手。告诉我你理想中的另一半是什么样的，我来帮你从数据库中找到最合适的人！\n\n你可以描述：\n• 性别、年龄范围\n• 地区/城市\n• 兴趣爱好\n• 性格特点\n• 任何你在意的点",
    },
  ]);
  const [input, setInput] = useState("");
  const [searching, setSearching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const doSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || searching) return;

      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setSearching(true);

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ query: trimmed }),
        });
        const data = await res.json().catch(() => ({}));

        if (data.code === 0) {
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              content: data.data.summary,
              matches: data.data.matches,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: data.msg || "搜索出错了，换个说法试试？" },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: "网络异常，请稍后重试 😅" },
        ]);
      } finally {
        setSearching(false);
      }
    },
    [searching],
  );

  const handleSubmit = () => {
    doSearch(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="page-shell flex flex-col min-h-screen">
      <AppHeader backHref="/discover" title="AI搜索" />

      {/* Chat messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ paddingBottom: "140px" }}
      >
        <div className="app-container space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              msg={msg}
              onSuggestion={doSearch}
              onUserClick={(id) => router.push(`/users/${id}`)}
            />
          ))}

          {searching && (
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 shrink-0 rounded-full bg-[var(--brand)] flex items-center justify-center text-sm border-2 border-[var(--ink)]">
                ✨
              </div>
              <div
                className="rounded-2xl rounded-tl-md border-2 border-[var(--ink)] px-4 py-3 shadow-[3px_3px_0_var(--ink)]"
                style={{ background: "var(--card)" }}
              >
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--ink)] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-[var(--ink)] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-[var(--ink)] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky input */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-[var(--ink)]"
        style={{ background: "var(--paper)" }}
      >
        <div className="app-container py-3 flex gap-2 items-end">
          <textarea
            ref={inputRef}
            className="flex-1 resize-none rounded-2xl border-2 border-[var(--ink)] px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--brand)] shadow-[3px_3px_0_var(--ink)]"
            style={{ background: "var(--card)", color: "var(--ink)", maxHeight: "120px" }}
            rows={1}
            placeholder="描述你理想中的另一半..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || searching}
            className="shrink-0 h-12 w-12 rounded-2xl border-2 border-[var(--ink)] flex items-center justify-center text-lg font-black transition hover:-translate-y-0.5 shadow-[3px_3px_0_var(--ink)] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: input.trim() ? "var(--brand)" : "var(--paper-2)",
              color: "var(--ink)",
            }}
          >
            {searching ? "⏳" : "🔍"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Message Bubble ────────────────────────────────────────── */

function MessageBubble({
  msg,
  onSuggestion,
  onUserClick,
}: {
  msg: Message;
  onSuggestion: (q: string) => void;
  onUserClick: (id: string) => void;
}) {
  if (msg.role === "system") {
    return (
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 shrink-0 rounded-full bg-[var(--brand)] flex items-center justify-center text-sm border-2 border-[var(--ink)]">
          ✨
        </div>
        <div className="flex-1 space-y-3">
          <div
            className="inline-block rounded-2xl rounded-tl-md border-2 border-[var(--ink)] px-4 py-3 text-sm leading-relaxed shadow-[3px_3px_0_var(--ink)] whitespace-pre-line"
            style={{ background: "var(--card)", color: "var(--ink)" }}
          >
            {msg.content}
          </div>
          {/* Suggestions */}
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestion(s)}
                className="rounded-xl border-2 border-[var(--ink)] px-3 py-1.5 text-xs font-bold transition hover:-translate-y-0.5 hover:bg-[var(--brand)] shadow-[2px_2px_0_var(--ink)]"
                style={{ background: "var(--paper-2)", color: "var(--ink)" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="inline-block max-w-[80%] rounded-2xl rounded-tr-md border-2 border-[var(--ink)] px-4 py-3 text-sm font-medium shadow-[3px_3px_0_var(--ink)]"
          style={{ background: "var(--brand)", color: "var(--ink)" }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  // AI response
  return (
    <div className="flex items-start gap-2">
      <div className="h-8 w-8 shrink-0 rounded-full bg-[var(--brand)] flex items-center justify-center text-sm border-2 border-[var(--ink)]">
        ✨
      </div>
      <div className="flex-1 space-y-3">
        <div
          className="inline-block rounded-2xl rounded-tl-md border-2 border-[var(--ink)] px-4 py-3 text-sm leading-relaxed shadow-[3px_3px_0_var(--ink)]"
          style={{ background: "var(--card)", color: "var(--ink)" }}
        >
          {msg.content}
        </div>

        {/* Match cards */}
        {msg.matches && msg.matches.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {msg.matches.map((m) => (
              <MatchCard key={m.id} match={m} onClick={() => onUserClick(m.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Match Card ────────────────────────────────────────────── */

function MatchCard({ match, onClick }: { match: SearchMatch; onClick: () => void }) {
  const photo = match.photos[0] ?? match.avatarUrl;
  const displayGender = match.gender === "male" ? "♂" : match.gender === "female" ? "♀" : "";

  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border-2 border-[var(--ink)] overflow-hidden shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-1 hover:shadow-[6px_6px_0_var(--ink)]"
      style={{ background: "var(--card)" }}
    >
      {/* Photo */}
      <div className="relative h-36 overflow-hidden" style={{ background: "var(--paper-2)" }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={match.name ?? "用户"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-4xl">
            {displayGender === "♂" ? "👦" : displayGender === "♀" ? "👧" : "👤"}
          </div>
        )}
        {/* Score badge */}
        <div
          className="absolute top-2 right-2 rounded-lg border-2 border-[var(--ink)] px-2 py-0.5 text-xs font-black shadow-[2px_2px_0_var(--ink)]"
          style={{ background: "var(--brand)", color: "var(--ink)" }}
        >
          {match.score}% 匹配
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-sm truncate" style={{ color: "var(--ink)" }}>
            {match.name ?? "匿名用户"}
          </span>
          {match.age && (
            <span className="text-xs font-bold" style={{ color: "var(--muted-ink)" }}>
              {match.age}岁
            </span>
          )}
          {displayGender && (
            <span className="text-xs">{displayGender}</span>
          )}
        </div>

        {match.bio && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--muted-ink)" }}>
            {match.bio}
          </p>
        )}

        {/* Reasons */}
        {match.reasons.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {match.reasons.slice(0, 3).map((r, i) => (
              <span
                key={i}
                className="inline-block rounded-md border border-[var(--ink)] px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: "var(--love-light)", color: "var(--ink)" }}
              >
                {r}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
