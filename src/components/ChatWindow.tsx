"use client";

import { useCallback, useRef, useState } from "react";

export function ChatWindow() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setLoading(true);

    let assistantContent = "";
    try {
      const res = await fetch("/api/owner-chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          ...(sessionId ? { sessionId } : {}),
        }),
      });
      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") break;

          try {
            const parsed = JSON.parse(raw);
            if (parsed.sessionId) setSessionId(parsed.sessionId);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (!delta) continue;

            assistantContent += delta;
            setMessages((m) => {
              const next = [...m];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = { ...last, content: assistantContent };
              }
              return next;
            });
            scrollToBottom();
          } catch {
            // Ignore malformed stream chunks.
          }
        }
      }

      await fetch("/api/owner-information/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: text, assistantMessage: assistantContent }),
      }).catch(() => {});
    } catch {
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, content: "发送失败，请稍后再试。" };
        }
        return next;
      });
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, scrollToBottom, sessionId]);

  return (
    <div className="glass-card flex h-[420px] flex-col overflow-hidden">
      <div className="border-b-2 border-[var(--ink)] bg-[#FFE500] px-4 py-3">
        <p className="text-sm font-black">和丘比一起完善自我介绍</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-2xl border-2 border-[var(--ink)] bg-[#FFFDF2] p-4 text-center text-sm font-semibold luxury-subtitle">
            从几句真实的表达开始。丘比会把你的偏好、表达方式和关系期待整理进个人资料。
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <span
              className={`max-w-[82%] rounded-2xl border-2 border-[var(--ink)] px-3 py-2 text-sm font-semibold leading-6 shadow-[3px_3px_0_var(--ink)] ${
                msg.role === "user" ? "bg-[#C7FF00]" : "bg-[#FFFDF2]"
              }`}
            >
              {msg.content || "丘比正在组织语言..."}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 border-t-2 border-[var(--ink)] bg-[#FFFDF2] p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send();
          }}
          placeholder="说说你最近的生活、喜欢的人、相处边界..."
          className="luxury-input flex-1 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={send}
          disabled={loading}
          className="luxury-btn px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? "发送中..." : "发送"}
        </button>
      </div>
    </div>
  );
}
