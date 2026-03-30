"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MatchFeedbackModal } from "@/components/MatchFeedbackModal";

type Msg = {
  id: string;
  senderType: string;
  content: string;
  createdAt: string;
  readByOther?: boolean;
};

export default function HumanChatPage() {
  const params = useParams();
  const id = params.id as string;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [targetName, setTargetName] = useState<string>("对方");
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [selectedImageDataUrl, setSelectedImageDataUrl] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const [bgMode, setBgMode] = useState<"preset0" | "preset1" | "preset2" | "preset3" | "preset4" | "upload">("preset0");
  const [bgUploadDataUrl, setBgUploadDataUrl] = useState<string | null>(null);

  const emojiOptions = ["😊", "😂", "❤️", "✨", "🥺", "🤔", "👍", "👋", "🌙", "🎧"];
  const lastMarkedRef = useRef<number>(0);
  const lastMsgCountRef = useRef<number>(0);

  const markRead = useCallback(() => {
    if (!id) return;
    fetch(`/api/matches/${id}/chat/read`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const key = `qiubi_chat_bg_${id}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { bgMode?: string; bgUploadDataUrl?: string | null };
      if (parsed.bgMode) setBgMode(parsed.bgMode as any);
      if (parsed.bgUploadDataUrl) setBgUploadDataUrl(parsed.bgUploadDataUrl);
    } catch {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const key = `qiubi_chat_bg_${id}`;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ bgMode, bgUploadDataUrl })
      );
    } catch {
      // ignore
    }
  }, [bgMode, bgUploadDataUrl, id]);

  const load = useCallback(async () => {
    if (!id) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const [detailRes, chatRes] = await Promise.all([
        fetch(`/api/matches/${id}`, { credentials: "include" }).then((r) => r.json()),
        fetch(`/api/matches/${id}/chat?limit=60`, { credentials: "include" }).then((r) => r.json()),
      ]);
      if (detailRes?.code === 0 && detailRes?.data?.targetUser) {
        setTargetName(detailRes.data.targetUser.name);
        setTargetUserId(detailRes.data.targetUser.id ?? null);
      }
      if (chatRes?.code === 0 && Array.isArray(chatRes?.data)) setMessages(chatRes.data);
    } catch {
      // ignore
    } finally {
      inFlightRef.current = false;
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 2300);
    const onFocus = () => load();
    if (typeof window !== "undefined") window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      if (typeof window !== "undefined") window.removeEventListener("focus", onFocus);
    };
  }, [id, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!id) return;
    if (messages.length === 0) return;
    const c = messages.length;
    const now = Date.now();
    if (c !== lastMsgCountRef.current) {
      lastMsgCountRef.current = c;
      // 新消息后稍微等一下，减少无意义请求
      window.setTimeout(() => {
        if (Date.now() - lastMarkedRef.current > 1200) {
          lastMarkedRef.current = Date.now();
          markRead();
        }
      }, 900);
    }
  }, [messages.length, id, markRead]);

  const sendText = async (text: string) => {
    const t = text.trim();
    if (!t) return;
    await fetch(`/api/matches/${id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: t }),
    }).catch(() => null);
  };

  const sendImage = async (dataUrl: string) => {
    if (!dataUrl) return;
    await fetch(`/api/matches/${id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `IMAGE_DATA:${dataUrl}` }),
    }).catch(() => null);
  };

  const send = async () => {
    if (sending || !id) return;
    const text = input.trim();
    const image = selectedImageDataUrl;
    if (!text && !image) return;
    setSending(true);
    setInput("");
    setSelectedImageDataUrl(null);
    try {
      if (text) await sendText(text);
      if (image) await sendImage(image);
    } finally {
      setSending(false);
      load();
    }
  };

  const simulateReply = async () => {
    if (simulating || !id) return;
    setSimulating(true);
    try {
      await fetch(`/api/matches/${id}/chat/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "你好呀，很高兴和你聊天～" }),
      }).catch(() => null);
    } finally {
      setSimulating(false);
      load();
    }
  };

  const onPickImage = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const MAX_BYTES = 160 * 1024; // 限制体积，避免 DataURL 过长导致写入失败
    if (file.size > MAX_BYTES) {
      alert("图片有点大啦，请换一张小一点的（<= 320KB）");
      return;
    }
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read image failed"));
      reader.readAsDataURL(file);
    });
    setSelectedImageDataUrl(dataUrl);
  };

  const renderContent = (content: string) => {
    if (content.startsWith("IMAGE_DATA:")) {
      const dataUrl = content.slice("IMAGE_DATA:".length);
      return (
        <img
          alt="图片"
          src={dataUrl}
          loading="lazy"
          decoding="async"
          className="max-h-[220px] w-auto rounded-lg object-contain"
        />
      );
    }
    return <span>{content}</span>;
  };

  return (
    <main
      className="page-shell flex min-h-screen flex-col"
      style={
        bgMode === "upload" && bgUploadDataUrl
          ? {
              backgroundImage: `url(${bgUploadDataUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : undefined
      }
    >
      <AppHeader
        backHref={`/matches/${id}`}
        title={targetName}
        right={
          <div className="flex items-center gap-2">
            {targetUserId ? (
              <Link
                href={`/users/${targetUserId}`}
                className="rounded-lg border border-emerald-400/35 bg-emerald-950/40 px-3 py-1.5 text-sm text-emerald-100 transition hover:border-emerald-400/55"
              >
                进入TA主页
              </Link>
            ) : null}
            <button
              type="button"
              onClick={simulateReply}
              disabled={simulating}
              className="text-sm text-amber-100/60 transition hover:text-amber-50 disabled:opacity-50"
            >
              {simulating ? "…" : "模拟对方回复"}
            </button>
            <button type="button" onClick={() => setFeedbackOpen(true)} className="text-sm text-rose-200 transition hover:text-rose-100">
              打分反馈
            </button>
          </div>
        }
      />
      <div
        className={
          bgMode === "preset0"
            ? "bg-transparent"
            : bgMode === "preset1"
              ? "bg-gradient-to-b from-rose-950/50 via-transparent to-transparent"
              : bgMode === "preset2"
                ? "bg-gradient-to-b from-sky-950/45 via-transparent to-transparent"
                : bgMode === "preset3"
                  ? "bg-gradient-to-b from-violet-950/45 via-transparent to-transparent"
                  : bgMode === "preset4"
                    ? "bg-gradient-to-b from-emerald-950/40 via-transparent to-transparent"
                    : "bg-transparent"
        }
      >
        <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto p-4">
          <div className="glass-card mb-4 rounded-2xl p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-amber-100/80">聊天背景</p>
              <div className="flex flex-wrap items-center gap-2">
                {(["preset0", "preset1", "preset2", "preset3", "preset4"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setBgMode(m)}
                    className={`rounded-lg border px-3 py-1 text-xs transition ${
                      bgMode === m ? "luxury-option-active border-amber-200/40" : "luxury-option"
                    }`}
                  >
                    {m === "preset0"
                      ? "默认"
                      : m === "preset1"
                        ? "玫瑰"
                        : m === "preset2"
                          ? "天空"
                          : m === "preset3"
                            ? "紫调"
                            : "青绿"}
                  </button>
                ))}
                <label className="luxury-option inline-flex cursor-pointer items-center rounded-lg px-3 py-1 text-xs hover:border-amber-200/35">
                  <span>上传</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const MAX_BYTES = 180 * 1024;
                      if (file.size > MAX_BYTES) {
                        alert("背景图有点大啦，请换一张 <= 180KB 的小图～");
                        return;
                      }
                      const dataUrl: string = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result));
                        reader.onerror = () => reject(new Error("read bg failed"));
                        reader.readAsDataURL(file);
                      });
                      setBgUploadDataUrl(dataUrl);
                      setBgMode("upload");
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-4" style={{ paddingTop: 0 }}>
          {messages.length === 0 ? (
            <p className="text-center text-sm luxury-subtitle">暂无消息，发一句打个招呼吧</p>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.senderType === "user_self" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      m.senderType === "user_self"
                        ? "border border-rose-400/30 bg-rose-950/40 text-rose-50"
                        : "border border-amber-100/15 bg-black/40 text-amber-100/90"
                    }`}
                  >
                    <p className="text-xs text-amber-100/55">
                      {m.senderType === "user_self" ? "我" : targetName}
                    </p>
                    <div className="mt-0.5">{renderContent(m.content)}</div>
                    {m.senderType === "user_self" && m.readByOther ? (
                      <p className="mt-1 text-[11px] text-emerald-300/90">对方已读</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        </div>
      </div>
      <div className="border-t border-amber-200/20 bg-[#0c111b]/92 p-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="输入消息…"
                className="luxury-input w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>

            {selectedImageDataUrl ? (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-rose-400/30 bg-rose-950/35 px-3 py-2">
                <span className="truncate text-xs text-rose-100">已选图片</span>
                <button
                  type="button"
                  className="text-xs text-rose-200 hover:text-rose-100"
                  onClick={() => setSelectedImageDataUrl(null)}
                >
                  移除
                </button>
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-1.5">
              {emojiOptions.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="rounded-md border border-amber-100/15 bg-black/30 px-2 py-1 text-sm text-amber-50 transition hover:border-amber-200/35"
                  onClick={() => setInput((prev) => (prev ? prev + e : e))}
                >
                  {e}
                </button>
              ))}
              <label className="inline-flex cursor-pointer items-center rounded-md border border-amber-100/15 bg-black/30 px-2 py-1 text-sm text-amber-50 transition hover:border-amber-200/35">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(ev) => onPickImage(ev.target.files?.[0] ?? null)}
                />
                📷
              </label>
            </div>
          </div>
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="luxury-btn h-fit self-end rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {sending ? "发送中…" : "发送"}
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
