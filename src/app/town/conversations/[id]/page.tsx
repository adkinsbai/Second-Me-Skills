"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

type Msg = { id: string; senderUserId: string; content: string; createdAt: string };

export default function TownConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const [checking, setChecking] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/me", { credentials: "include" });
        const d = await r.json().catch(() => null);
        if (cancelled) return;
        if (!d?.user?.id) {
          router.replace("/auth");
          return;
        }
        setMyUserId(d.user.id);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const load = async () => {
    const r = await fetch(`/api/town/conversations/${conversationId}/messages?limit=80`, {
      credentials: "include",
    });
    const d = await r.json().catch(() => null);
    if (!r.ok || d?.code !== 0) return;
    setMessages(d.data.messages as Msg[]);
  };

  useEffect(() => {
    if (checking) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const now = new Date();
    setInput("");

    // 乐观渲染一条（失败会由下一次 load 拉回）
    setMessages((prev) => [
      ...prev,
      { id: `tmp_${now.getTime()}`, senderUserId: myUserId ?? "unknown", content: text, createdAt: now.toISOString() },
    ]);

    try {
      const r = await fetch(`/api/town/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: text }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || d?.code !== 0) return;
      await load();
    } finally {
      setSending(false);
    }
  };

  if (checking) {
    return (
      <main className="page-shell">
        <AppHeader backHref="/town/messages" title="小镇聊天" />
        <div className="app-container py-12">
          <p className="luxury-subtitle text-sm">加载中…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <AppHeader backHref="/town/messages" title="小镇聊天" />
      <div className="app-container py-6">
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-amber-200/15">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.32em] text-amber-100/60">Town Chat</p>
              <p className="text-xs text-amber-100/45">会话按帖子分组</p>
            </div>
          </div>

          <div className="max-h-[66vh] overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-sm luxury-subtitle">暂无消息，先来一句开场吧</p>
            ) : (
              messages.map((m) => {
                const isMe = myUserId && m.senderUserId === myUserId;
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm border ${
                        isMe
                          ? "border-amber-200/25 bg-amber-200/10 text-amber-50"
                          : "border-amber-100/15 bg-black/25 text-amber-100/85"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p className="mt-1 text-[11px] text-amber-100/45">{new Date(m.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-amber-200/15 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入消息…"
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                className="luxury-input flex-1 rounded-2xl px-4 py-2 text-sm"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || !input.trim()}
                className="luxury-btn rounded-2xl px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {sending ? "发送中…" : "发送"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-amber-100/45">消息会进入对方“小镇消息中心”</p>
          </div>
        </div>
      </div>
    </main>
  );
}

