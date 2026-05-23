"use client";

import { useState, useRef, useCallback } from "react";

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
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    let assistantContent = "";
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

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
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("event: session") || line.startsWith("data: ")) {
            const data = line.startsWith("data: ") ? line.slice(6) : "";
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.sessionId) setSessionId(parsed.sessionId);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
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
              }
            } catch {
              // ignore
            }
          }
        }
      }

      // 写入“主人信息库”：把主人刚说的话逐步沉淀到本地 owner_information 文件
      await fetch("/api/owner-information/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: text, assistantMessage: assistantContent }),
      }).catch(() => {});
    } catch (e) {
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, content: "发送失败，请重试。" };
        }
        return next;
      });
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, sessionId, scrollToBottom]);

  return (
    <div className="glass-card flex h-[400px] flex-col overflow-hidden rounded-2xl">
      <div className="border-b border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
        与数字体共建主人信息库
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm luxury-subtitle">从几句真实的你开始说吧（我会越来越懂你）</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <span
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "border border-rose-400/30 bg-rose-950/40 text-rose-50"
                  : "border border-gray-200 bg-black/35 text-gray-700"
              }`}
            >
              {msg.content}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 border-t border-gray-200 bg-gray-50 p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="输入消息…"
          className="luxury-input flex-1 rounded-xl px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={send}
          disabled={loading}
          className="luxury-btn rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "发送中…" : "发送"}
        </button>
      </div>
    </div>
  );
}
