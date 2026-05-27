"use client";

import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
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
import { IMAGE_DATA_PREFIX } from "@/lib/utils";

const PAGE_SIZE = 40;

const EMOJI_ROWS = [
  ["😊", "😂", "🥰", "😍", "🤭", "😎", "🤝", "🥺", "😮", "🫶"],
  ["❤️", "💗", "💛", "💚", "💙", "💜", "✨", "🔥", "🌙", "☀️"],
  ["👍", "👏", "🙌", "🙏", "💪", "✌️", "👋", "👌", "🎉", "🍀"],
  ["🍜", "☕", "🎬", "🎧", "📚", "✈️", "🏖️", "🚲", "🌃", "🎮"],
];

type GuidanceData = {
  openerSuggestions: string[];
  nextActions: string[];
  reflectionPrompts: string[];
  relationshipProgress: { steps: string[]; current: number };
  dateSuggestion?: string;
  messageCount: number;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msgDay = new Date(d);
  msgDay.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
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
  return new Date(cur.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000;
}

function sortedMessages(messages: BubbleMsg[]) {
  return [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

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
  const [selectedImageDataUrl, setSelectedImageDataUrl] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [guidance, setGuidance] = useState<GuidanceData | null>(null);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [, startTransition] = useTransition();

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const pendingIdRef = useRef(0);
  const lastCreatedAtRef = useRef<string | null>(null);

  const rememberLast = useCallback((items: BubbleMsg[]) => {
    if (items.length) lastCreatedAtRef.current = items[items.length - 1].createdAt;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const mergeMessages = useCallback(
    (incoming: BubbleMsg[]) => {
      setMessages((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        for (const msg of incoming) map.set(msg.id, msg);
        const next = sortedMessages(Array.from(map.values()));
        rememberLast(next);
        return next;
      });
    },
    [rememberLast]
  );

  const refreshGuidance = useCallback(async () => {
    if (!id) return;
    const result = await fetch(`/api/matches/${id}/guidance`, { credentials: "include" })
      .then((r) => r.json())
      .catch(() => null);
    if (result?.code === 0) setGuidance(result.data);
  }, [id]);

  const initialLoad = useCallback(async () => {
    if (!id) return;

    setGuidanceLoading(true);
    const [detailRes, chatRes, guidanceRes] = await Promise.all([
      fetch(`/api/matches/${id}`, { credentials: "include" })
        .then((r) => r.json())
        .catch(() => null),
      fetch(`/api/matches/${id}/chat?limit=${PAGE_SIZE}`, { credentials: "include" })
        .then((r) => r.json())
        .catch(() => null),
      fetch(`/api/matches/${id}/guidance`, { credentials: "include" })
        .then((r) => r.json())
        .catch(() => null),
    ]);

    if (detailRes?.code === 0 && detailRes?.data?.targetUser) {
      setTargetName(detailRes.data.targetUser.name ?? "对方");
      setTargetUserId(detailRes.data.targetUser.id ?? null);
    }

    if (chatRes?.code === 0 && Array.isArray(chatRes.data)) {
      const next = sortedMessages(chatRes.data);
      rememberLast(next);
      setMessages(next);
      setHasMore(next.length >= PAGE_SIZE);
      setTimeout(() => scrollToBottom(false), 60);
    }

    if (guidanceRes?.code === 0) setGuidance(guidanceRes.data);
    setGuidanceLoading(false);
  }, [id, rememberLast, scrollToBottom]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  useEffect(() => {
    if (!id) return;
    let closed = false;

    const connect = () => {
      if (closed) return;
      const after = lastCreatedAtRef.current ?? new Date(Date.now() - 60_000).toISOString();
      const es = new EventSource(`/api/matches/${id}/chat/stream?after=${encodeURIComponent(after)}`);
      sseRef.current = es;

      es.addEventListener("messages", (event) => {
        const incoming: BubbleMsg[] = JSON.parse(event.data);
        if (!incoming.length) return;
        startTransition(() => mergeMessages(incoming));
        setTimeout(() => scrollToBottom(), 80);

        fetch(`/api/matches/${id}/chat/read`, {
          method: "POST",
          credentials: "include",
        }).catch(() => {});
      });

      es.addEventListener("read_update", () => {
        fetch(`/api/matches/${id}/chat?limit=${PAGE_SIZE}`, { credentials: "include" })
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
        if (!closed) setTimeout(connect, 1000);
      });

      es.onerror = () => {
        es.close();
        if (!closed) setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      closed = true;
      sseRef.current?.close();
    };
  }, [id, mergeMessages, scrollToBottom]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !id) return;
    const oldest = messages[0];
    if (!oldest) return;

    setLoadingMore(true);
    try {
      const scrollEl = scrollRef.current;
      const prevScrollHeight = scrollEl?.scrollHeight ?? 0;
      const res = await fetch(
        `/api/matches/${id}/chat?limit=${PAGE_SIZE}&before=${encodeURIComponent(oldest.createdAt)}`,
        { credentials: "include" }
      ).then((r) => r.json());

      if (res?.code === 0 && Array.isArray(res.data) && res.data.length > 0) {
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          for (const msg of res.data as BubbleMsg[]) map.set(msg.id, msg);
          const next = sortedMessages(Array.from(map.values()));
          rememberLast(next);
          return next;
        });
        setHasMore((res.data as BubbleMsg[]).length >= PAGE_SIZE);
        requestAnimationFrame(() => {
          if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight - prevScrollHeight;
        });
      } else {
        setHasMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, id, loadingMore, messages, rememberLast]);

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
    if (text) toSend.push({ content: text, pendingId: `pending_${++pendingIdRef.current}` });
    if (image) toSend.push({ content: `${IMAGE_DATA_PREFIX}${image}`, pendingId: `pending_${++pendingIdRef.current}` });

    const now = new Date().toISOString();
    const optimistic: BubbleMsg[] = toSend.map(({ content, pendingId }) => ({
      id: pendingId,
      senderType: "user_self",
      content,
      createdAt: now,
      readByOther: false,
      pending: true,
    }));
    setMessages((prev) => {
      const next = [...prev, ...optimistic];
      rememberLast(next);
      return next;
    });
    setTimeout(() => scrollToBottom(), 60);

    try {
      for (const { content, pendingId } of toSend) {
        const res = await fetch(`/api/matches/${id}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content }),
        }).then((r) => r.json().catch(() => null));

        if (res?.code === 0 && res?.data?.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId ? { ...res.data, senderType: "user_self" as const, pending: false } : m
            )
          );
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === pendingId ? { ...m, pending: false, failed: true } : m))
          );
        }
      }
    } finally {
      setSending(false);
      void refreshGuidance();
    }
  }, [id, input, refreshGuidance, rememberLast, scrollToBottom, selectedImageDataUrl, sending]);

  const applySuggestion = useCallback((text: string) => {
    setInput((value) => (value.trim() ? `${value.trim()}\n${text}` : text));
    setShowGuide(false);
    setShowEmoji(false);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.style.height = "40px";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    });
  }, []);

  const onInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    const el = event.target;
    el.style.height = "40px";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const onPickImage = async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 300 * 1024) {
      alert("图片请控制在 300KB 内。");
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

  const canSend = Boolean(input.trim() || selectedImageDataUrl);
  const guideExpanded = messages.length === 0 || showGuide;

  return (
    <main className="chat-shell flex h-dvh flex-col overflow-hidden bg-[#F7F2E8]">
      <div className="chat-header shrink-0 border-b-2 border-[var(--ink)] bg-[#FFFDF2]">
        <AppHeader
          backHref={`/matches/${id}`}
          title={targetName}
          right={
            <div className="flex items-center gap-2">
              {targetUserId && (
                <Link href={`/users/${targetUserId}`} className="luxury-btn-secondary px-3 py-1.5 text-xs">
                  TA主页
                </Link>
              )}
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="luxury-btn px-3 py-1.5 text-xs"
              >
                反馈
              </button>
            </div>
          }
        />
      </div>

      <div
        ref={scrollRef}
        className="chat-messages flex-1 overflow-y-auto px-4 py-3"
        style={{ overscrollBehavior: "contain" }}
      >
        {hasMore && (
          <div className="mb-3 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="luxury-btn-secondary px-4 py-1.5 text-xs disabled:opacity-50"
            >
              {loadingMore ? "加载中..." : "查看更早消息"}
            </button>
          </div>
        )}

        {(guidance || guidanceLoading) && (
          <section className="mb-4 rounded-[1.25rem] border-2 border-[var(--ink)] bg-[#FFE500] p-3 shadow-[5px_5px_0_var(--ink)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--ink)]">
                  Qiubi Guide
                </p>
                <p className="mt-1 text-sm font-black text-[var(--ink)]">
                  {messages.length === 0 ? "选一句自然开场" : "下一句可以更具体"}
                </p>
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowGuide((value) => !value)}
                  className="luxury-btn-secondary shrink-0 px-3 py-1 text-xs"
                >
                  {guideExpanded ? "收起" : "建议"}
                </button>
              )}
            </div>

            {!guideExpanded && guidance?.nextActions?.[0] && (
              <p className="mt-2 text-xs font-bold leading-5 text-[var(--ink)]/70">
                建议：{guidance.nextActions[0]}
              </p>
            )}

            {guideExpanded && guidance && (
              <div className="mt-3 space-y-3">
                {!!guidance.openerSuggestions?.length && (
                  <div>
                    <p className="text-xs font-black text-[var(--ink)]">可直接使用</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {guidance.openerSuggestions.slice(0, 4).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => applySuggestion(item)}
                          className="min-h-[58px] rounded-xl border-2 border-[var(--ink)] bg-[#FFFDF2] px-3 py-2 text-left text-xs font-bold leading-5 text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5 hover:bg-[#C7FF00]"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!!guidance.nextActions?.length && (
                  <div>
                    <p className="text-xs font-black text-[var(--ink)]">下一步</p>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {guidance.nextActions.slice(0, 3).map((item) => (
                        <span
                          key={item}
                          className="whitespace-nowrap rounded-full border-2 border-[var(--ink)] bg-[#C7FF00] px-3 py-1 text-xs font-black text-[var(--ink)] shadow-[2px_2px_0_var(--ink)]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!!guidance.reflectionPrompts?.length && (
                  <p className="rounded-xl border-2 border-[var(--ink)] bg-[#174BFF] px-3 py-2 text-xs font-bold leading-5 text-white shadow-[3px_3px_0_var(--ink)]">
                    {guidance.reflectionPrompts[0]}
                  </p>
                )}
              </div>
            )}

            {guideExpanded && !guidance && guidanceLoading && (
              <p className="mt-3 text-xs font-bold text-[var(--ink)]/70">正在整理聊天建议...</p>
            )}
          </section>
        )}

        {messages.length === 0 ? (
          <div className="flex min-h-[42vh] items-center justify-center">
            <div className="glass-card max-w-sm p-5 text-center">
              <p className="text-sm font-black">还没有消息</p>
              <p className="mt-2 text-sm leading-6 luxury-subtitle">
                可以选择上方建议，也可以自己发一句具体、轻松的开场。
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {messages.map((msg, i) => (
              <div key={msg.id}>
                {needsDivider(messages[i - 1], msg) && <ChatTimeDivider label={fmtTime(msg.createdAt)} />}
                <ChatBubble
                  msg={msg}
                  targetName={targetName}
                  showReadStatus={i === messages.length - 1 || msg.pending}
                />
              </div>
            ))}
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      <div className="chat-input-bar shrink-0 border-t-2 border-[var(--ink)] bg-[#FFFDF2]">
        {selectedImageDataUrl && (
          <div className="flex items-center gap-3 border-b-2 border-[var(--ink)] px-4 py-2">
            <img
              src={selectedImageDataUrl}
              alt="待发送图片"
              className="h-14 w-14 rounded-xl border-2 border-[var(--ink)] object-cover shadow-[3px_3px_0_var(--ink)]"
            />
            <div className="flex-1 text-xs font-black luxury-subtitle">已选择图片</div>
            <button
              type="button"
              onClick={() => setSelectedImageDataUrl(null)}
              className="luxury-btn-secondary px-3 py-1 text-xs"
            >
              移除
            </button>
          </div>
        )}

        {showEmoji && (
          <div className="border-b-2 border-[var(--ink)] bg-[#FFE500] px-4 py-3">
            <div className="space-y-2">
              {EMOJI_ROWS.map((row, rowIndex) => (
                <div key={rowIndex} className="flex flex-wrap gap-2">
                  {row.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setInput((value) => value + emoji)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[#FFFDF2] text-lg shadow-[2px_2px_0_var(--ink)] transition hover:-translate-y-0.5"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end gap-2 px-3 py-3">
          <button
            type="button"
            onClick={() => setShowEmoji((value) => !value)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] text-xl shadow-[3px_3px_0_var(--ink)] ${
              showEmoji ? "bg-[#FFE500]" : "bg-[#FFFDF2]"
            }`}
            aria-label="表情"
          >
            😊
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            placeholder="发消息..."
            rows={1}
            className="chat-textarea flex-1 resize-none rounded-2xl border-2 border-[var(--ink)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] outline-none placeholder:text-black/35 focus:shadow-[5px_5px_0_#174BFF]"
            style={{ height: "40px", maxHeight: "120px" }}
          />

          <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[#FFFDF2] text-xl shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void onPickImage(event.target.files?.[0] ?? null);
                event.currentTarget.value = "";
              }}
            />
            📷
          </label>

          <button
            type="button"
            onClick={send}
            disabled={sending || !canSend}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[#C7FF00] text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--ink)] disabled:opacity-40"
            aria-label="发送"
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

      <MatchFeedbackModal matchId={id} open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </main>
  );
}
