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
  type BubblePosition,
} from "@/components/ChatBubble";
import { IMAGE_DATA_PREFIX } from "@/lib/utils";
import {
  fetchReactions,
  toggleReactionServer,
  type ReactionMap,
} from "@/components/MessageReactions";

const PAGE_SIZE = 40;

/* ──────────────────── Expanded Emoji Picker Data ──────────────────── */
type EmojiCategory = { label: string; icon: string; emojis: string[] };

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    label: "表情",
    icon: "😀",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃",
      "😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙",
      "🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🫢",
    ],
  },
  {
    label: "爱心",
    icon: "❤️",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💗",
      "💖","💝","💘","💕","💞","💓","💟","❣️","💔","❤️‍🔥",
      "🫶","😍","🥰","😘","💋","😻","💑","👩‍❤️‍👨","🩷","🩵",
    ],
  },
  {
    label: "手势",
    icon: "👍",
    emojis: [
      "👍","👎","👏","🙌","🤝","🙏","💪","✌️","🤞","🫰",
      "🤟","🤘","👌","🤌","🤏","👈","👉","👆","👇","☝️",
      "✋","🤚","🖐️","🖖","👋","🤙","🫱","🫲","🫳","🫴",
    ],
  },
  {
    label: "美食",
    icon: "🍕",
    emojis: [
      "🍕","🍔","🍟","🌭","🍿","🧂","🥚","🍳","🧈","🥞",
      "🧇","🥓","🥩","🍗","🍖","🦴","🌮","🌯","🫔","🥙",
      "🧆","🥗","🍜","🍝","🍣","🍱","🍰","🎂","🍩","☕",
    ],
  },
  {
    label: "活动",
    icon: "🎯",
    emojis: [
      "⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸",
      "🎯","🎮","🕹️","🎲","🧩","🎭","🎨","🎬","🎤","🎧",
      "🎸","🎹","🥁","🎺","🎻","🎪","🏆","🥇","🥈","🥉",
    ],
  },
  {
    label: "地点",
    icon: "🏠",
    emojis: [
      "🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪",
      "🏫","🏬","🏭","🏯","🏰","⛪","🕌","🕍","⛩️","🗼",
      "🗽","⛲","🌁","🌃","🌆","🌇","🌉","🌌","⛺","🏕️",
    ],
  },
  {
    label: "符号",
    icon: "✨",
    emojis: [
      "✨","⭐","🌟","💫","🔥","💥","🎉","🎊","✅","❌",
      "⭕","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤",
      "💯","💢","💤","💨","🕳️","💬","👁️‍🗨️","🗯️","💭","🔔",
    ],
  },
];

/* ──────────────────── Quick Reply Engine (contextual) ──────────────────── */
const QR_QUESTION = ["我在想...", "说实话...", "你觉得呢？", "让我想想 🤔", "好问题！"];
const QR_EXPERIENCE = ["我也试过！", "听起来很棒", "下次带我", "太厉害了 👏", "我也有类似经历"];
const QR_EMOTIONAL = ["我能理解", "抱抱 🤗", "你真的很棒", "辛苦了", "我在这里"];
const QR_ICEBREAKER = ["你好呀 👋", "最近怎么样？", "发现你也喜欢...", "这个周末有什么安排？", "分享一个有趣的事"];
const QR_DEEPER = ["你觉得什么最重要？", "你对未来有什么期待？", "有什么想一起做的？", "你最开心的事是什么？", "如果可以重来..."];
const QR_GENERAL = ["哈哈 真的吗？", "听起来不错！", "我也这么觉得 😊", "然后呢？", "太有意思了！", "下次一起试试？", "我也是！", "好巧 我也是", "确实 这很重要"];

function generateQuickReplies(lastMessage: string, totalMessages: number): string[] {
  let pool: string[];

  if (totalMessages < 4) {
    // Short conversation — ice breakers
    pool = QR_ICEBREAKER;
  } else if (lastMessage.includes("？") || lastMessage.includes("?")) {
    // Question detected
    pool = QR_QUESTION;
  } else if (
    lastMessage.includes("！") || lastMessage.includes("!") ||
    lastMessage.includes("试过") || lastMessage.includes("去过") ||
    lastMessage.includes("玩过") || lastMessage.includes("看过") ||
    lastMessage.includes("吃过") || lastMessage.includes("去过")
  ) {
    pool = QR_EXPERIENCE;
  } else if (
    lastMessage.includes("难过") || lastMessage.includes("开心") ||
    lastMessage.includes("伤心") || lastMessage.includes("生气") ||
    lastMessage.includes("焦虑") || lastMessage.includes("压力") ||
    lastMessage.includes("开心") || lastMessage.includes("幸福") ||
    lastMessage.includes("感动") || lastMessage.includes("累") ||
    lastMessage.includes("心") || lastMessage.includes("想哭")
  ) {
    pool = QR_EMOTIONAL;
  } else if (totalMessages > 30) {
    // Long conversation — deeper questions
    pool = QR_DEEPER;
  } else {
    pool = QR_GENERAL;
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

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

/** Determine bubble position within a consecutive group from the same sender. */
function getBubblePosition(messages: BubbleMsg[], index: number): BubblePosition {
  const cur = messages[index];
  const prev = index > 0 ? messages[index - 1] : undefined;
  const next = index < messages.length - 1 ? messages[index + 1] : undefined;

  const prevSame = prev && prev.senderType === cur.senderType && !needsDivider(prev, cur);
  const nextSame = next && next.senderType === cur.senderType && !needsDivider(cur, next);

  if (prevSame && nextSame) return "middle";
  if (prevSame && !nextSame) return "last";
  if (!prevSame && nextSame) return "first";
  return "single";
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
  const [emojiCategory, setEmojiCategory] = useState(0);
  const [selectedImageDataUrl, setSelectedImageDataUrl] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [guidance, setGuidance] = useState<GuidanceData | null>(null);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [, startTransition] = useTransition();

  // Reactions, typing, quick replies
  const [reactionsState, setReactionsState] = useState<Record<string, ReactionMap>>({});
  const [otherTyping, setOtherTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(true);

  // #2: Scroll-to-bottom button
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // #3: New messages indicator
  const [newMsgBar, setNewMsgBar] = useState(0); // number of new messages while scrolled up

  // #4: Reply/quote
  const [replyTo, setReplyTo] = useState<BubbleMsg | null>(null);

  // #8: Online status (static green dot for now)
  const [isOnline] = useState(true);

  // #9: Conversation duration
  const [matchCreatedAt, setMatchCreatedAt] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const pendingIdRef = useRef(0);
  const lastCreatedAtRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAtBottomRef = useRef(true);

  const rememberLast = useCallback((items: BubbleMsg[]) => {
    if (items.length) lastCreatedAtRef.current = items[items.length - 1].createdAt;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    setNewMsgBar(0);
    setUnreadCount(0);
    isAtBottomRef.current = true;
  }, []);

  // #2: Scroll position tracking
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distFromBottom < 120;
    isAtBottomRef.current = atBottom;
    setShowScrollBtn(distFromBottom > 300);
    if (atBottom) {
      setNewMsgBar(0);
      setUnreadCount(0);
    }
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

  // Load reactions from server
  useEffect(() => {
    if (id) {
      fetchReactions(id).then((data) => setReactionsState(data));
    }
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
    // #9: Store match creation date
    if (detailRes?.code === 0 && detailRes?.data?.createdAt) {
      setMatchCreatedAt(detailRes.data.createdAt);
    } else if (detailRes?.code === 0 && detailRes?.data?.match?.createdAt) {
      setMatchCreatedAt(detailRes.data.match.createdAt);
    }

    if (chatRes?.code === 0 && Array.isArray(chatRes.data)) {
      const next = sortedMessages(chatRes.data);
      rememberLast(next);
      setMessages(next);
      setHasMore(next.length >= PAGE_SIZE);
      setTimeout(() => scrollToBottom(false), 60);

      // Generate quick replies from last received message
      const lastReceived = [...next].reverse().find((m) => m.senderType === "user_target");
      if (lastReceived) {
        setQuickReplies(generateQuickReplies(lastReceived.content, next.length));
      }
    }

    if (guidanceRes?.code === 0) setGuidance(guidanceRes.data);
    setGuidanceLoading(false);
  }, [id, rememberLast, scrollToBottom]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  // Typing indicator polling
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      fetch(`/api/matches/${id}/typing`, { credentials: "include" })
        .then((r) => r.json())
        .then((result) => {
          if (result?.code === 0) {
            setOtherTyping(result.data?.typing ?? false);
          }
        })
        .catch(() => {});
    }, 3000);

    return () => clearInterval(interval);
  }, [id]);

  // Send typing status when user types
  const notifyTyping = useCallback(() => {
    if (!id) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    fetch(`/api/matches/${id}/typing`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    // Auto-clear typing after 5s of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setOtherTyping(false);
    }, 5000);
  }, [id]);

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

        // #3: If scrolled up, show new message indicator; else auto-scroll
        if (!isAtBottomRef.current) {
          const targetMsgs = incoming.filter((m) => m.senderType === "user_target");
          if (targetMsgs.length > 0) {
            setNewMsgBar((prev) => prev + targetMsgs.length);
            setUnreadCount((prev) => prev + targetMsgs.length);
          }
        } else {
          setTimeout(() => scrollToBottom(), 80);
        }

        fetch(`/api/matches/${id}/chat/read`, {
          method: "POST",
          credentials: "include",
        }).catch(() => {});

        // Generate quick replies from new incoming messages
        const lastReceived = incoming
          .filter((m) => m.senderType === "user_target")
          .pop();
        if (lastReceived) {
          setMessages((prev) => {
            setQuickReplies(generateQuickReplies(lastReceived.content, prev.length));
            return prev;
          });
          setShowQuickReplies(true);
        }
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

  // #4: Delete message handler
  const handleDelete = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    // Try server delete (fire and forget)
    if (id) {
      fetch(`/api/matches/${id}/chat/${messageId}`, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => {});
    }
  }, [id]);

  const send = useCallback(async () => {
    if (sending || !id) return;
    const text = input.trim();
    const image = selectedImageDataUrl;
    if (!text && !image) return;

    setSending(true);
    setInput("");
    setSelectedImageDataUrl(null);
    setShowEmoji(false);
    setShowQuickReplies(false);
    if (textareaRef.current) textareaRef.current.style.height = "40px";

    const toSend: Array<{ content: string; pendingId: string }> = [];
    if (text) toSend.push({ content: text, pendingId: `pending_${++pendingIdRef.current}` });
    if (image) toSend.push({ content: `${IMAGE_DATA_PREFIX}${image}`, pendingId: `pending_${++pendingIdRef.current}` });

    const now = new Date().toISOString();
    const optimistic: BubbleMsg[] = toSend.map(({ content, pendingId }) => ({
      id: pendingId,
      senderType: "user_self" as const,
      content,
      createdAt: now,
      readByOther: false,
      pending: true,
      replyToId: replyTo?.id,
    }));
    setMessages((prev) => {
      const next = [...prev, ...optimistic];
      rememberLast(next);
      return next;
    });
    setReplyTo(null); // clear reply after sending
    setTimeout(() => scrollToBottom(), 60);

    try {
      for (const { content, pendingId } of toSend) {
        const res = await fetch(`/api/matches/${id}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content, replyToId: replyTo?.id }),
        }).then((r) => r.json().catch(() => null));

        if (res?.code === 0 && res?.data?.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === pendingId ? { ...res.data, senderType: "user_self" as const, pending: false, replyToId: replyTo?.id } : m
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
  }, [id, input, refreshGuidance, rememberLast, replyTo, scrollToBottom, selectedImageDataUrl, sending]);

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

  const handleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!id) return;
      // Optimistic update
      setReactionsState((prev) => {
        const current = prev[messageId]?.[emoji] ?? [];
        const isReacted = current.includes("self");
        const nextUsers = isReacted
          ? current.filter((u) => u !== "self")
          : [...current, "self"];
        const msgReactions = { ...(prev[messageId] ?? {}) };
        if (nextUsers.length > 0) {
          msgReactions[emoji] = nextUsers;
        } else {
          delete msgReactions[emoji];
        }
        return { ...prev, [messageId]: msgReactions };
      });
      // Persist to server
      await toggleReactionServer(id, messageId, emoji);
    },
    [id]
  );

  // #4: Reply handler
  const handleReply = useCallback((msg: BubbleMsg) => {
    setReplyTo(msg);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  const onInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    notifyTyping();
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

  // #9: Calculate days since match
  const daysSinceMatch = matchCreatedAt
    ? Math.max(1, Math.floor((Date.now() - new Date(matchCreatedAt).getTime()) / 86400000) + 1)
    : null;

  // Build a map of reply-to messages for quick lookup
  const msgMap = useRef<Map<string, BubbleMsg>>(new Map());
  useEffect(() => {
    const map = new Map<string, BubbleMsg>();
    for (const m of messages) map.set(m.id, m);
    msgMap.current = map;
  }, [messages]);

  return (
    <main className="chat-shell flex h-dvh flex-col overflow-hidden bg-[var(--paper-2)]">
      <div className="chat-header shrink-0 border-b-2 border-[var(--ink)] bg-[var(--paper)]">
        <AppHeader
          backHref={`/matches/${id}`}
          title={
            <span className="flex items-center gap-2">
              {targetName}
              {/* #8: Online status indicator */}
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full border border-[var(--ink)] ${
                  isOnline ? "bg-green-500" : "bg-gray-400"
                }`}
                title={isOnline ? "在线" : "离线"}
              />
            </span>
          }
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
        onScroll={handleScroll}
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
          <section className="mb-4 rounded-[1.25rem] border-2 border-[var(--ink)] bg-[var(--c-gold)] p-3 shadow-[5px_5px_0_var(--ink)]">
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
                          className="min-h-[58px] rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-left text-xs font-bold leading-5 text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--brand)]"
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
                          className="whitespace-nowrap rounded-full border-2 border-[var(--ink)] bg-[var(--brand)] px-3 py-1 text-xs font-black text-[var(--ink)] shadow-[2px_2px_0_var(--ink)]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!!guidance.reflectionPrompts?.length && (
                  <p className="rounded-xl border-2 border-[var(--ink)] bg-[var(--c-blue)] px-3 py-2 text-xs font-bold leading-5 text-white shadow-[3px_3px_0_var(--ink)]">
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
              <p className="mt-2 text-sm leading-6 text-[var(--ink)]/60">
                可以选择上方建议，也可以自己发一句具体、轻松的开场。
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, i) => {
              const isFirst = i === 0;
              const showDiv = needsDivider(messages[i - 1], msg);
              const position = getBubblePosition(messages, i);
              const replyToMsg = msg.replyToId ? msgMap.current.get(msg.replyToId) : undefined;

              return (
                <div key={msg.id}>
                  {showDiv && (
                    <ChatTimeDivider
                      label={fmtTime(msg.createdAt)}
                      subLabel={isFirst && daysSinceMatch ? `相识第 ${daysSinceMatch} 天` : undefined}
                    />
                  )}
                  <ChatBubble
                    msg={msg}
                    targetName={targetName}
                    showReadStatus={i === messages.length - 1 || msg.pending}
                    reactions={reactionsState[msg.id]}
                    currentUserId="self"
                    onReact={handleReaction}
                    onReply={handleReply}
                    onDelete={handleDelete}
                    position={position}
                    replyToMsg={replyToMsg}
                  />
                </div>
              );
            })}

            {/* Typing indicator */}
            {otherTyping && (
              <div className="flex items-end gap-2">
                <div className="chat-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--brand)] text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">
                  {(targetName?.[0] ?? "Q").toUpperCase()}
                </div>
                <div className="rounded-2xl rounded-bl-sm border-2 border-[var(--ink)] bg-[var(--paper)] px-4 py-3 shadow-[4px_4px_0_var(--ink)]">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-[var(--ink)]/50">对方正在输入</span>
                    <span className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ink)]/40" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ink)]/40" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ink)]/40" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* #2: Scroll-to-bottom floating button */}
      {showScrollBtn && (
        <div className="pointer-events-none absolute bottom-[140px] right-4 z-30 flex items-center justify-center">
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="pointer-events-auto relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--brand)] text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5"
            aria-label="回到底部"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 16l-6-6h12l-6 6z" />
            </svg>
            {/* Unread badge */}
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--love)] px-1 text-[10px] font-black text-white shadow-[2px_2px_0_var(--ink)]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* #3: New messages indicator bar */}
      {newMsgBar > 0 && (
        <div className="absolute bottom-[140px] left-1/2 z-30 -translate-x-1/2">
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="flex items-center gap-1.5 rounded-full border-2 border-[var(--ink)] bg-[var(--brand)] px-4 py-2 text-xs font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 16l-6-6h12l-6 6z" />
            </svg>
            {newMsgBar} 条新消息
          </button>
        </div>
      )}

      <div className="chat-input-bar shrink-0 border-t-2 border-[var(--ink)] bg-[var(--paper)]">
        {/* Quick reply suggestions */}
        {quickReplies.length > 0 && showQuickReplies && messages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-b-2 border-[var(--ink)] bg-[var(--paper-2)] px-3 py-2">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => {
                  setInput(reply);
                  setShowQuickReplies(false);
                  requestAnimationFrame(() => textareaRef.current?.focus());
                }}
                className="whitespace-nowrap rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-1 text-xs font-bold text-[var(--ink)] shadow-[2px_2px_0_var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--brand)]"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* #4: Reply preview above input */}
        {replyTo && (
          <div className="flex items-center gap-2 border-b-2 border-[var(--ink)] bg-[var(--paper-2)] px-3 py-2">
            <span className="text-sm">↩️</span>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-black text-[var(--ink)]/50">
                回复 {replyTo.senderType === "user_self" ? "自己" : targetName}
              </span>
              <p className="truncate text-xs font-bold text-[var(--ink)]/70">
                {replyTo.content.startsWith(IMAGE_DATA_PREFIX) ? "[图片]" : replyTo.content}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="shrink-0 text-sm text-[var(--ink)]/40 hover:text-[var(--ink)]"
              aria-label="取消回复"
            >
              ✕
            </button>
          </div>
        )}

        {selectedImageDataUrl && (
          <div className="flex items-center gap-3 border-b-2 border-[var(--ink)] px-4 py-2">
            <img
              src={selectedImageDataUrl}
              alt="待发送图片"
              className="h-14 w-14 rounded-xl border-2 border-[var(--ink)] object-cover shadow-[3px_3px_0_var(--ink)]"
            />
            <div className="flex-1 text-xs font-black text-[var(--ink)]/60">已选择图片</div>
            <button
              type="button"
              onClick={() => setSelectedImageDataUrl(null)}
              className="luxury-btn-secondary px-3 py-1 text-xs"
            >
              移除
            </button>
          </div>
        )}

        {/* #5: Expanded emoji picker with categories */}
        {showEmoji && (
          <div className="border-b-2 border-[var(--ink)] bg-[var(--c-gold)] px-4 py-3">
            {/* Category tabs */}
            <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
              {EMOJI_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setEmojiCategory(idx)}
                  className={`flex items-center gap-1 whitespace-nowrap rounded-full border-2 border-[var(--ink)] px-2.5 py-1 text-[11px] font-black shadow-[2px_2px_0_var(--ink)] transition ${
                    emojiCategory === idx
                      ? "bg-[var(--brand)] text-[var(--ink)]"
                      : "bg-[var(--paper)] text-[var(--ink)]/60 hover:bg-[var(--paper-2)]"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
            {/* Emoji grid for selected category */}
            <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
              {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setInput((value) => value + emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] text-lg shadow-[2px_2px_0_var(--ink)] transition hover:-translate-y-0.5"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end gap-2 px-3 py-3">
          <button
            type="button"
            onClick={() => setShowEmoji((value) => !value)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] text-xl shadow-[3px_3px_0_var(--ink)] ${
              showEmoji ? "bg-[var(--c-gold)]" : "bg-[var(--paper)]"
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
            className="chat-textarea flex-1 resize-none rounded-2xl border-2 border-[var(--ink)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] outline-none placeholder:text-black/35 focus:shadow-[5px_5px_0_var(--c-blue)]"
            style={{ height: "40px", maxHeight: "120px" }}
          />

          <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] text-xl shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5">
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--brand)] text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--ink)] disabled:opacity-40"
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
