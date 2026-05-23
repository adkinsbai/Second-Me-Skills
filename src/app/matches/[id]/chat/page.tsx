"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useTransition,
} from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MatchFeedbackModal } from "@/components/MatchFeedbackModal";
import {
  ChatBubble,
  ChatTimeDivider,
  type BubbleMsg,
} from "@/components/ChatBubble";

// ─── Time label helpers ────────────────────────────────────────────────
function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor(
    (now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000
  );
  const hhmm = d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (diffDays === 0) return hhmm;
  if (diffDays === 1) return `昨天 ${hhmm}`;
  if (diffDays < 7) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${weekdays[d.getDay()]} ${hhmm}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${hhmm}`;
}

function needsDivider(prev: BubbleMsg | undefined, cur: BubbleMsg): boolean {
  if (!prev) return true;
  return (
    new Date(cur.createdAt).getTime() -
      new Date(prev.createdAt).getTime() >
    5 * 60 * 1000
  );
}

// ─── Emoji panel data ──────────────────────────────────────────────────
const EMOJI_ROWS = [
  ["😊", "😂", "🥰", "😍", "🤩", "😎", "🥺", "😭", "😡", "🤔"],
  ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💕"],
  ["👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "👋", "🙏", "💪"],
  ["🌹", "🌸", "🌺", "✨", "🎉", "🎊", "🔥", "⭐", "🌙", "☀️"],
  ["🍕", "🍜", "🍣", "🍦", "🎧", "🎮", "📚", "✈️", "🏖️", "⛰️"],
];

// ─── Load more page size ───────────────────────────────────────────────
const PAGE_SIZE = 40;

export default function HumanChatPage() {
  const params = useParams();
  const id = params.id as string;

  const [messages, setMessages] = useState<BubbleMsg[]>([]);
  const [targetName, setTargetName] = useState("对方");
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedImageDataUrl, setSelectedImageDataUrl] = useState<
    string | null
  >(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingVisible, setTypingVisible] = useState(false);
  const [, startTransition] = useTransition();

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sseShouldReconnect = useRef(true);
  const sseRef = useRef<EventSource | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingIdRef = useRef(0);

  // ─── Scroll to bottom ─────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  // ─── Merge messages (de-dup by id) ────────────────────────────────
  const mergeMessages = useCallback((incoming: BubbleMsg[]) => {
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) {
        map.set(m.id, m);
      }
      return Array.from(map.values()).sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, []);

  // ─── Initial load ─────────────────────────────────────────────────
  const initialLoad = useCallback(async () => {
    if (!id) return;
    const [detailRes, chatRes] = await Promise.all([
      fetch(`/api/matches/${id}`, { credentials: "include" }).then((r) =>
        r.json()
      ),
      fetch(`/api/matches/${id}/chat?limit=${PAGE_SIZE}`, {
        credentials: "include",
      }).then((r) => r.json()),
    ]).catch(() => [null, null]);

    if (detailRes?.code === 0 && detailRes?.data?.targetUser) {
      setTargetName(detailRes.data.targetUser.name ?? "对方");
      setTargetUserId(detailRes.data.targetUser.id ?? null);
    }
    if (chatRes?.code === 0 && Array.isArray(chatRes.data)) {
      const msgs: BubbleMsg[] = chatRes.data;
      setMessages(msgs);
      setHasMore(msgs.length >= PAGE_SIZE);
      setTimeout(() => scrollToBottom(false), 60);
    }
  }, [id, scrollToBottom]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  // ─── SSE connection ───────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (!id || !sseShouldReconnect.current) return;

    const lastMsg = messages[messages.length - 1];
    const after = lastMsg
      ? new Date(lastMsg.createdAt).toISOString()
      : new Date(Date.now() - 60_000).toISOString();

    const es = new EventSource(
      `/api/matches/${id}/chat/stream?after=${encodeURIComponent(after)}`
    );
    sseRef.current = es;

    es.addEventListener("messages", (e) => {
      const incoming: BubbleMsg[] = JSON.parse(e.data);
      if (!incoming.length) return;
      startTransition(() => {
        mergeMessages(incoming);
      });
      setTimeout(() => scrollToBottom(), 80);

      // Show typing indicator briefly for incoming from other
      const hasIncoming = incoming.some((m) => m.senderType === "user_target");
      if (hasIncoming) {
        setTypingVisible(false);
      }

      // Auto mark read
      fetch(`/api/matches/${id}/chat/read`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    });

    es.addEventListener("read_update", () => {
      // Refresh to pick up read status changes
      fetch(`/api/matches/${id}/chat?limit=${PAGE_SIZE}`, {
        credentials: "include",
      })
        .then((r) => r.json())
        .then((chatRes) => {
          if (chatRes?.code === 0 && Array.isArray(chatRes.data)) {
            startTransition(() => mergeMessages(chatRes.data));
          }
        })
        .catch(() => {});
    });

    es.addEventListener("reconnect", () => {
      es.close();
      if (sseShouldReconnect.current) {
        setTimeout(connectSSE, 1000);
      }
    });

    es.onerror = () => {
      es.close();
      if (sseShouldReconnect.current) {
        setTimeout(connectSSE, 2000);
      }
    };
  }, [id, mergeMessages, scrollToBottom]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    sseShouldReconnect.current = true;
    connectSSE();
    return () => {
      sseShouldReconnect.current = false;
      sseRef.current?.close();
    };
  }, [connectSSE]);

  // ─── Load older messages ──────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !id) return;
    setLoadingMore(true);
    const oldest = messages[0];
    if (!oldest) {
      setLoadingMore(false);
      return;
    }
    try {
      const r = await fetch(
        `/api/matches/${id}/chat?limit=${PAGE_SIZE}&before=${encodeURIComponent(
          oldest.createdAt
        )}`,
        { credentials: "include" }
      );
      const res = await r.json();
      if (res?.code === 0 && Array.isArray(res.data) && res.data.length > 0) {
        const scrollEl = scrollRef.current;
        const prevScrollHeight = scrollEl?.scrollHeight ?? 0;
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          for (const m of res.data as BubbleMsg[]) map.set(m.id, m);
          return Array.from(map.values()).sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
        setHasMore((res.data as BubbleMsg[]).length >= PAGE_SIZE);
        // Keep scroll position after prepend
        requestAnimationFrame(() => {
          if (scrollEl) {
            scrollEl.scrollTop =
              scrollEl.scrollHeight - prevScrollHeight;
          }
        });
      } else {
        setHasMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [id, loadingMore, hasMore, messages]);

  // ─── Send message ─────────────────────────────────────────────────
  const send = useCallback(async () => {
    if (sending || !id) return;
    const text = input.trim();
    const image = selectedImageDataUrl;
    if (!text && !image) return;

    setSending(true);
    setInput("");
    setSelectedImageDataUrl(null);
    setShowEmoji(false);
    if (textareaRef.current) textareaRef.current.style.height = "40px";

    const toSend: Array<{ content: string; pendingId: string }> = [];
    if (text) {
      const pid = `pending_${++pendingIdRef.current}`;
      toSend.push({ content: text, pendingId: pid });
    }
    if (image) {
      const pid = `pending_${++pendingIdRef.current}`;
      toSend.push({
        content: `IMAGE_DATA:${image}`,
        pendingId: pid,
      });
    }

    // Optimistic insert
    const now = new Date().toISOString();
    const optimistic: BubbleMsg[] = toSend.map(({ content, pendingId }) => ({
      id: pendingId,
      senderType: "user_self",
      content,
      createdAt: now,
      readByOther: false,
      pending: true,
    }));
    setMessages((prev) => [...prev, ...optimistic]);
    setTimeout(() => scrollToBottom(), 60);

    try {
      for (const { content, pendingId } of toSend) {
        const r = await fetch(`/api/matches/${id}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content }),
        });
        const res = await r.json().catch(() => null);
        if (res?.code === 0 && res?.data?.id) {
          // Replace optimistic with real
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId
                ? { ...res.data, senderType: "user_self" as const, pending: false }
                : m
            )
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId ? { ...m, pending: false, failed: true } : m
            )
          );
        }
      }
    } finally {
      setSending(false);
    }
  }, [id, input, selectedImageDataUrl, sending, scrollToBottom]);

  // ─── Textarea auto-resize ─────────────────────────────────────────
  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "40px";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // ─── Typing indicator simulation ─────────────────────────────────
  // Show "对方正在输入" when SSE is quiet but user recently received messages
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  // ─── Image pick ───────────────────────────────────────────────────
  const onPickImage = async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 300 * 1024) {
      alert("图片请控制在 300KB 以内哦～");
      return;
    }
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });
    setSelectedImageDataUrl(dataUrl);
  };

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <main className="chat-shell flex h-dvh flex-col overflow-hidden bg-[#0a0d14]">
      {/* Header */}
      <div className="chat-header shrink-0 border-b border-white/8 bg-[#0d1120]/95 backdrop-blur-xl">
        <AppHeader
          backHref={`/matches/${id}`}
          title={targetName}
          right={
            <div className="flex items-center gap-2">
              {targetUserId && (
                <Link
                  href={`/users/${targetUserId}`}
                  className="rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-3 py-1.5 text-xs text-emerald-200 transition hover:border-emerald-400/50"
                >
                  TA的主页
                </Link>
              )}
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="rounded-xl border border-rose-400/30 bg-rose-950/35 px-3 py-1.5 text-xs text-rose-200 transition hover:border-rose-400/50"
              >
                打分
              </button>
            </div>
          }
        />
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="chat-messages flex-1 overflow-y-auto px-4 py-3"
        style={{ overscrollBehavior: "contain" }}
      >
        {/* Load more */}
        {hasMore && (
          <div className="mb-3 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-gray-400 backdrop-blur transition hover:border-white/25 hover:text-gray-900 disabled:opacity-40"
            >
              {loadingMore ? "加载中…" : "查看更早的消息"}
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-300">
              还没有消息，发一句打个招呼吧 👋
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {messages.map((msg, i) => (
              <div key={msg.id}>
                {needsDivider(messages[i - 1], msg) && (
                  <ChatTimeDivider label={fmtTime(msg.createdAt)} />
                )}
                <ChatBubble
                  msg={msg}
                  targetName={targetName}
                  showReadStatus={i === messages.length - 1 || msg.pending}
                />
              </div>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {typingVisible && (
          <div className="mt-2 flex items-end gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-violet-500 text-sm font-bold text-white shadow">
              {targetName[0]}
            </div>
            <div className="chat-typing-indicator rounded-2xl rounded-bl-sm border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-md">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input bar */}
      <div className="chat-input-bar shrink-0 border-t border-white/8 bg-[#0d1120]/95 backdrop-blur-xl">
        {/* Image preview */}
        {selectedImageDataUrl && (
          <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2">
            <img
              src={selectedImageDataUrl}
              alt="预览"
              className="h-14 w-14 rounded-xl object-cover shadow"
            />
            <div className="flex-1 text-xs text-gray-400">已选图片</div>
            <button
              type="button"
              onClick={() => setSelectedImageDataUrl(null)}
              className="rounded-lg border border-white/15 px-3 py-1 text-xs text-gray-500 transition hover:border-white/30"
            >
              移除
            </button>
          </div>
        )}

        {/* Emoji panel */}
        {showEmoji && (
          <div className="border-b border-white/8 bg-[#0c111b]/80 px-4 py-3">
            <div className="space-y-2">
              {EMOJI_ROWS.map((row, ri) => (
                <div key={ri} className="flex gap-2">
                  {row.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setInput((p) => p + emoji)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-xl transition hover:bg-white/10 active:scale-90"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Text input row */}
        <div className="flex items-end gap-2 px-3 py-3">
          {/* Emoji toggle */}
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl transition ${
              showEmoji
                ? "bg-amber-400/20 text-amber-300"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            😊
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            placeholder="发消息…"
            rows={1}
            className="chat-textarea flex-1 resize-none rounded-2xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm text-gray-900 placeholder-amber-100/35 outline-none backdrop-blur transition focus:border-rose-400/40 focus:bg-white/12 focus:ring-1 focus:ring-rose-400/20"
            style={{ height: "40px", maxHeight: "120px" }}
          />

          {/* Image */}
          <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-xl text-gray-400 transition hover:text-gray-600">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
            />
            📷
          </label>

          {/* Send */}
          <button
            type="button"
            onClick={send}
            disabled={sending || (!input.trim() && !selectedImageDataUrl)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/30 transition active:scale-95 disabled:opacity-40"
          >
            {sending ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 -rotate-45 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <MatchFeedbackModal
        matchId={id}
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </main>
  );
}
