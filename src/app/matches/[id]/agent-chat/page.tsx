"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { MAX_AGENT_MESSAGES } from "@/lib/agentChatConstants";

type Msg = { id: string; senderType: string; content: string; createdAt: string };

function splitTag(content: string): { tag: string | null; text: string } {
  const m = content.match(/^【([^】]+)】\s*(.*)$/);
  if (!m) return { tag: null, text: content };
  return { tag: m[1], text: m[2] || "" };
}

export default function AgentChatPage() {
  const params = useParams();
  const id = params.id as string;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [targetName, setTargetName] = useState<string>("对方");
  const [heartValue, setHeartValue] = useState(60);
  const [heartThreshold, setHeartThreshold] = useState<number | null>(null);
  const [stopReason, setStopReason] = useState<"low" | "high" | null>(null);
  const [loading, setLoading] = useState(true);
  const [genStatus, setGenStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [genError, setGenError] = useState("");
  const stopReasonRef = useRef<"low" | "high" | null>(null);
  const stopRequestedRef = useRef<"low" | "high" | null>(null);
  const connectTriggeredRef = useRef(false);
  const processedTargetMsgIdsRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);
  const pollTimerRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  const computeHeartDelta = (text: string): number => {
    const positivePatterns = [/一起/, /陪伴/, /陪你/, /理解/, /共鸣/, /在乎/, /照顾/, /愿意/, /可以试试/, /边界/, /尊重/, /安全感/];
    const negativePatterns = [/不太喜欢/, /没兴趣/, /算了/, /不合适/, /不太想/];
    const hasPositive = positivePatterns.some((re) => re.test(text));
    const hasNegative = negativePatterns.some((re) => re.test(text));
    if (hasPositive && !hasNegative) return 1;
    if (hasNegative && !hasPositive) return -1;
    if (/[压力|累|焦虑|紧张]/.test(text)) return 1;
    return 0;
  };

  const load = useCallback(() => {
    if (!id) return;
    initializedRef.current = false;
    processedTargetMsgIdsRef.current.clear();
    stopRequestedRef.current = null;
    connectTriggeredRef.current = false;
    return Promise.all([
      fetch(`/api/matches/${id}`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/matches/${id}/agent-chat`, { credentials: "include" }).then((r) => r.json()),
      fetch("/api/settings/heartbeat", { credentials: "include" })
        .then((r) => r.json())
        .catch(() => null),
      fetch(`/api/matches/${id}/agent-chat/job`, { credentials: "include" }).then((r) => r.json()).catch(() => null),
    ])
      .then(([matchRes, chatRes, settings, jobRes]) => {
        if (matchRes.code === 0 && matchRes.data?.targetUser?.name) {
          setTargetName(matchRes.data.targetUser.name);
        }
        if (chatRes.code === 0 && Array.isArray(chatRes.data)) {
          setMessages(chatRes.data);
        }
        if (settings && settings.code === 0 && settings.data?.heartThreshold) {
          setHeartThreshold(settings.data.heartThreshold);
        }

        const serverStatus = jobRes?.code === 0 ? jobRes.data?.status : null;
        const serverStopReason = jobRes?.code === 0 ? jobRes.data?.stopReason : null;
        const errorMessage = jobRes?.code === 0 ? jobRes.data?.errorMessage : null;

        setGenError("");

        if (serverStopReason === "low" || serverStopReason === "high") {
          stopReasonRef.current = serverStopReason;
          stopRequestedRef.current = serverStopReason;
          setStopReason(serverStopReason);
        } else {
          stopReasonRef.current = null;
          stopRequestedRef.current = null;
          setStopReason(null);
        }

        if (serverStatus === "running") setGenStatus("running");
        else if (serverStatus === "failed") {
          setGenStatus("error");
          setGenError(errorMessage || "生成失败，请稍后重试");
        } else if (serverStatus === "queued") setGenStatus("idle");
        else setGenStatus("done");

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const appendHeartForTargetMsg = useCallback(
    (msg: Msg) => {
      if (msg.senderType !== "agent_target") return;
      setHeartValue((prev) => {
        const delta = computeHeartDelta(msg.content);
        const next = Math.max(0, Math.min(100, prev + delta));
        if (next < 55 && !stopRequestedRef.current) {
          stopRequestedRef.current = "low";
          stopReasonRef.current = "low";
          setStopReason("low");
          fetch(`/api/matches/${id}/agent-chat/stop`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "low" }),
          }).catch(() => {});
        } else if (heartThreshold != null && next >= heartThreshold && !stopRequestedRef.current) {
          stopRequestedRef.current = "high";
          stopReasonRef.current = "high";
          setStopReason("high");
          fetch(`/api/matches/${id}/agent-chat/stop`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "high" }),
          }).catch(() => {});

          if (next >= 80 && !connectTriggeredRef.current) {
            connectTriggeredRef.current = true;
            fetch(`/api/matches/${id}/connect`, { method: "POST", credentials: "include" }).catch(() => {});
          }
        }
        return next;
      });
    },
    [heartThreshold, id]
  );

  // 初次加载：把现有 messages 回放成心动值，并根据当前 heart 阈值做一次“停止队列”的决策
  useEffect(() => {
    if (loading || !id) return;
    if (initializedRef.current) return;

    const targetMsgs = messages.filter((m) => m.senderType === "agent_target");
    const nextHeart = targetMsgs.reduce((acc, m) => {
      const delta = computeHeartDelta(m.content);
      return Math.max(0, Math.min(100, acc + delta));
    }, 60);

    // 初始化 processed 集合：避免后续增量逻辑重复计入
    processedTargetMsgIdsRef.current.clear();
    for (const m of messages) {
      if (m.senderType === "agent_target") processedTargetMsgIdsRef.current.add(m.id);
    }

    setHeartValue(nextHeart);

    // 如果服务器已停（low/high），就以服务器为准；否则根据心动值做停机策略，并通知服务端停止队列
    if (!stopRequestedRef.current && nextHeart >= 55 && heartThreshold == null) {
      // 心动阈值还没加载完：先别把 initializedRef 置为 true，等阈值到达后再判断是否要停 high。
      return;
    }

    if (!stopRequestedRef.current) {
      if (nextHeart < 55) {
        stopRequestedRef.current = "low";
        stopReasonRef.current = "low";
        setStopReason("low");
        fetch(`/api/matches/${id}/agent-chat/stop`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "low" }),
        }).catch(() => {});
      } else if (heartThreshold != null && nextHeart >= heartThreshold) {
        stopRequestedRef.current = "high";
        stopReasonRef.current = "high";
        setStopReason("high");
        fetch(`/api/matches/${id}/agent-chat/stop`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "high" }),
        }).catch(() => {});

        if (nextHeart >= 80 && !connectTriggeredRef.current) {
          connectTriggeredRef.current = true;
          fetch(`/api/matches/${id}/connect`, { method: "POST", credentials: "include" }).catch(() => {});
        }
      }
    }

    initializedRef.current = true;
  }, [loading, id, messages, heartThreshold]);

  // 增量更新心动值：只处理新增的 agent_target 消息
  useEffect(() => {
    if (loading || !id) return;
    if (!initializedRef.current) return;
    for (const m of messages) {
      if (m.senderType !== "agent_target") continue;
      if (processedTargetMsgIdsRef.current.has(m.id)) continue;
      processedTargetMsgIdsRef.current.add(m.id);
      appendHeartForTargetMsg(m);
    }
  }, [messages, loading, id, appendHeartForTargetMsg]);

  // 页面打开后启动（或恢复）服务端队列；随后轮询展示新消息
  const startTriggeredRef = useRef(false);
  useEffect(() => {
    if (loading || !id) return;
    if (startTriggeredRef.current) return;
    startTriggeredRef.current = true;
    void fetch(`/api/matches/${id}/agent-chat/start`, { method: "POST", credentials: "include" }).catch(() => {});
  }, [loading, id]);

  useEffect(() => {
    if (loading || !id) return;

    const poll = async () => {
      if (!id) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const [chatRes, jobRes] = await Promise.all([
          fetch(`/api/matches/${id}/agent-chat`, { credentials: "include" }).then((r) => r.json()).catch(() => null),
          fetch(`/api/matches/${id}/agent-chat/job`, { credentials: "include" }).then((r) => r.json()).catch(() => null),
        ]);

        if (chatRes?.code === 0 && Array.isArray(chatRes.data)) {
          setMessages(chatRes.data);
        }

        const serverStatus = jobRes?.code === 0 ? jobRes.data?.status : null;
        const serverStopReason = jobRes?.code === 0 ? jobRes.data?.stopReason : null;

        if (serverStatus === "running") {
          setGenStatus("running");
        } else if (serverStatus === "failed") {
          setGenStatus("error");
          setGenError(jobRes?.data?.errorMessage || "生成失败，请稍后重试");
        }
        else if (serverStatus === "queued") setGenStatus("idle");
        else setGenStatus("done");

        if (!stopRequestedRef.current && (serverStopReason === "low" || serverStopReason === "high")) {
          stopRequestedRef.current = serverStopReason;
          stopReasonRef.current = serverStopReason;
          setStopReason(serverStopReason);
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void poll();
    };

    tick();
    pollTimerRef.current = window.setInterval(tick, 2500);

    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
  }, [loading, id]);

  const clearAgentChat = async () => {
    if (!id) return;
    try {
      await fetch(`/api/matches/${id}/agent-chat`, { method: "DELETE", credentials: "include" });
      setMessages([]);
      setGenStatus("idle");
      setStopReason(null);
      setHeartValue(60);
      stopRequestedRef.current = null;
      stopReasonRef.current = null;
      connectTriggeredRef.current = false;
      processedTargetMsgIdsRef.current.clear();
      initializedRef.current = false;
      window.location.reload();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <main className="page-shell app-container py-10">
        <p className="luxury-subtitle text-sm">加载中…</p>
      </main>
    );
  }

  const agentCount = messages.filter((m) => m.senderType === "agent_self" || m.senderType === "agent_target").length;

  return (
    <main className="page-shell flex min-h-screen flex-col">
      <AppHeader backHref={`/matches/${id}`} title={`Agent 初识 · ${targetName}`} />
      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col p-4">
        <div className="glass-card mb-4 space-y-2 rounded-2xl px-3 py-3 text-xs text-rose-100/90">
          <p>
            这是<strong className="text-amber-100/95">正式功能</strong>：两位 Agent 仅依据双方主人<strong>简介、信息库与（我方绑定的）Second Me 标签</strong>聊天；不知道的内容会说「我还真不知道」，不会编造对方隐私。
          </p>
          <p className="text-[11px] text-rose-200/75">
            初识对话最多 <strong>{MAX_AGENT_MESSAGES}</strong> 条。生成过程由丘比自动推进，无需「演示模式」开关。
          </p>
          {genStatus === "running" && (
            <p className="text-[11px] font-medium text-amber-200/90">正在生成下一轮对话，请稍候…</p>
          )}
          {genStatus === "error" && genError && <p className="text-[11px] font-medium text-rose-300">{genError}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => load()}
              className="luxury-btn-secondary rounded-full px-3 py-1 text-[11px] font-medium"
            >
              刷新记录
            </button>
            <button
              type="button"
              onClick={clearAgentChat}
              className="rounded-full border border-rose-400/35 bg-rose-950/40 px-3 py-1 text-[11px] font-medium text-rose-100 transition hover:border-rose-400/55"
            >
              清空并重新生成（慎用）
            </button>
          </div>
        </div>

        {messages.length === 0 && genStatus === "running" ? (
          <p className="text-center text-sm luxury-subtitle">正在写下第一条 Agent 开场…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm luxury-subtitle">暂无记录</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.senderType === "agent_self" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.senderType === "agent_self"
                      ? "border border-rose-400/25 bg-rose-950/35 text-rose-50"
                      : "border border-amber-100/15 bg-black/35 text-amber-100/90"
                  }`}
                >
                  <p className="text-xs text-amber-100/55">
                    {m.senderType === "agent_self" ? "我的 Agent" : `${targetName}的 Agent`}
                  </p>
                  {(() => {
                    const parsed = splitTag(m.content);
                    return (
                      <>
                        {parsed.tag && (
                          <span className="mt-1 inline-flex rounded-full border border-amber-200/25 bg-black/30 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                            {parsed.tag}
                          </span>
                        )}
                        <p className="mt-1">{parsed.text}</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-center text-[11px] text-amber-100/45">
          已生成 {agentCount} / {MAX_AGENT_MESSAGES} 条
        </p>

        <div className="glass-card mt-4 rounded-2xl p-3 text-xs text-amber-100/85">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium text-amber-100">心动值（参考）</span>
            <span className="text-[11px] text-amber-100/50">
              {heartThreshold != null ? `当前：${heartValue} / 阈值：${heartThreshold}` : `当前：${heartValue}`}
            </span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-black/40 ring-1 ring-amber-100/15">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-amber-400/90 to-rose-500/90 transition-all"
              style={{ width: `${heartValue}%` }}
            />
          </div>
          {stopReason === "low" && (
            <p className="mt-2 text-[11px] text-amber-100/65">心动值偏低，已暂停自动续写；你可返回匹配列表或查看报告。</p>
          )}
          {stopReason === "high" && (
            <p className="mt-2 text-[11px] text-rose-200/85">
              已达到你的心动阈值，系统已尝试解锁真人聊天入口（若仍未解锁，请在匹配详情页手动解锁）。
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <Link href={`/matches/${id}`} className="text-sm text-amber-200 underline underline-offset-2">
            返回匹配详情
          </Link>
        </div>
      </div>
    </main>
  );
}
