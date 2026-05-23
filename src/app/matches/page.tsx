"use client";
/* eslint-disable react/no-unescaped-entities */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { UpdateIntroModal } from "@/components/UpdateIntroModal";

const BIO_MAX = 40;

type MeUser = { id: string; name: string | null; email?: string | null; avatarUrl?: string | null };

function resolveDisplayName(u: MeUser): string {
  const n = u.name?.trim(); if (n) return n;
  const em = u.email?.trim(); if (em) { const at = em.indexOf("@"); if (at > 0) return em.slice(0, at); }
  if (u.id?.length >= 6) return `用户·${u.id.slice(-6)}`;
  return "我";
}

type MatchItem = {
  id: string; status: string;
  targetUser: { id: string; name: string | null; avatarUrl: string | null; bio: string | null };
  matchReason: string; unreadCount: number;
};

type MatchSearchReport = {
  searchedUserCount: number;
  stages: { id: string; title: string; detail: string; count: number }[];
  matchedUser?: { id: string; name: string | null; avatarUrl: string | null; bio: string | null; matchReason: string } | null;
};

function Avatar({ src, name, size = 48 }: { src?: string | null; name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, minWidth: size }}
      className="relative overflow-hidden rounded-full ring-1 ring-white/10">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand)] to-teal-400 opacity-80" />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center font-bold text-black"
          style={{ fontSize: size * 0.38 }}>
          {(name?.[0] ?? "?").toUpperCase()}
        </div>
      )}
    </div>
  );
}

/* ─── Feature cards ─────────────────────────────────────────── */
const FEATURES = [
  {
    id: "discover", href: "/discover" as string | null,
    label: "翻牌发现", sub: "右滑喜欢",
    icon: "🃏",
    bg: "linear-gradient(145deg,#0C1D3A 0%,#0A2855 50%,#0E4080 100%)",
    accent: "#5B9EFF",
    glow: "rgba(91,158,255,0.25)",
  },
  {
    id: "town", href: "/town" as string | null,
    label: "丘比小镇", sub: "帖子广场",
    icon: "🏡",
    bg: "linear-gradient(145deg,#2A0A1A 0%,#3D0A22 50%,#5C0E30 100%)",
    accent: "#FF4E9A",
    glow: "rgba(255,45,109,0.25)",
  },
  {
    id: "agent", href: null as string | null,
    label: "我的 Agent", sub: "AI分身",
    icon: "🤖",
    bg: "linear-gradient(145deg,#170A2E 0%,#230A44 50%,#350E6A 100%)",
    accent: "#A855F7",
    glow: "rgba(168,85,247,0.25)",
  },
  {
    id: "settings", href: "/settings/heartbeat" as string | null,
    label: "心动设置", sub: "偏好配置",
    icon: "✨",
    bg: "linear-gradient(145deg,#271500 0%,#3D2200 50%,#5C3500 100%)",
    accent: "#FFB624",
    glow: "rgba(255,182,36,0.25)",
  },
];

export default function MatchesPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [agentIntro, setAgentIntro] = useState("");
  const [list, setList] = useState<MatchItem[]>([]);
  const [dailyMatchTime, setDailyMatchTime] = useState("21:00");
  const [todayMatchedCount, setTodayMatchedCount] = useState(0);
  const [dailyMatchLimit, setDailyMatchLimit] = useState(3);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedHint, setSeedHint] = useState<string | null>(null);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [searchReport, setSearchReport] = useState<MatchSearchReport | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  const load = async () => {
    setSeedError(null); setSeedHint(null); setLoading(true);
    try {
      let meData = await fetch("/api/me", { credentials: "include" }).then(r => r.json());
      if (!meData?.user) {
        await new Promise(r => setTimeout(r, 350));
        meData = await fetch("/api/me", { credentials: "include" }).then(r => r.json()).catch(() => ({}));
      }
      if (!meData?.user) { setSeedError("登录状态同步中，请稍后重试"); return; }
      const me = meData.user as MeUser;
      setUserName(resolveDisplayName(me)); setUserAvatar(me.avatarUrl ?? null);
      fetch("/api/agent/intro/summary", { method: "POST", credentials: "include" })
        .then(r => r.json()).then(res => setAgentIntro(res.code === 0 && res.data?.summary ? res.data.summary : "")).catch(() => {});
      const d = await fetch("/api/matches", { credentials: "include" }).then(r => r.json()).catch(() => ({}));
      if (d.code === 401) { router.replace("/"); return; }
      if (d.code === 0) {
        setList(d.data.list ?? []);
        setDailyMatchTime(d.data.dailyMatchTime ?? "21:00");
        setTodayMatchedCount(Number(d.data.todayMatchedCount ?? 0));
        setDailyMatchLimit(Number(d.data.dailyMatchLimit ?? 6));
      }
    } catch { setSeedError("网络异常，请刷新重试"); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const h = () => load(); window.addEventListener("focus", h); return () => window.removeEventListener("focus", h);
  }, []);

  const handleDelete = (id: string) => {
    if (!window.confirm("确定删除这个匹配吗？")) return;
    fetch(`/api/matches/${id}`, { method: "DELETE", credentials: "include" })
      .then(r => r.json()).then(d => { if (d.code === 0) setList(p => p.filter(m => m.id !== id)); }).catch(() => {});
  };

  const seed = () => {
    setSeeding(true); setSeedError(null); setSeedHint(null); setSeedSuccess(false); setSearchReport(null);
    fetch("/api/matches/seed", { method: "POST", credentials: "include" })
      .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, d })).catch(() => ({ ok: false, status: r.status, d: {} })))
      .then(({ ok, status, d }) => {
        if (ok && d.code === 0) {
          setSeedSuccess(true);
          if (d.data?.pipeline) setSearchReport({ searchedUserCount: Number(d.data.pipeline.searchedUserCount ?? 0), stages: d.data.pipeline.stages ?? [], matchedUser: d.data.matchedUser ?? null });
          if (typeof d.data?.message === "string" && d.data.message.trim()) setSeedHint(d.data.message.trim());
          load(); setTimeout(() => setSeedSuccess(false), 5000);
        } else setSeedError(status === 401 ? "请先登录" : d?.message || "生成失败，请稍后重试");
      })
      .catch(() => setSeedError("网络错误"))
      .finally(() => setSeeding(false));
  };

  const matchesLeft = Math.max(0, dailyMatchLimit - todayMatchedCount);

  if (loading) return (
    <div className="page-shell flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--ink)] border-t-[var(--brand)]" />
    </div>
  );

  return (
    <div className="page-shell min-h-screen">
      <AppHeader />

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <div className="relative mx-auto max-w-[780px] px-4 pb-8 pt-6">

        {/* 用户标识行 */}
        <div className="poster-panel flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="relative h-12 w-12 overflow-hidden rounded-xl"
                style={{ boxShadow: "4px 4px 0 var(--brand)" }}>
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand)] to-teal-500" />
                {userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userAvatar} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-lg font-black text-black">
                    {(userName?.[0] ?? "?").toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--bg)] bg-[var(--brand)]" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fg-4)]">你好</p>
              <p className="text-lg font-black tracking-tight text-white leading-tight">{userName || "用户"}</p>
            </div>
          </div>
          <Link
            href="/profile"
            className="rounded-xl border-2 border-[var(--ink)] bg-[var(--c-amber)] px-3.5 py-1.5 text-xs font-black text-[var(--ink)] shadow-[4px_4px_0_var(--ink)] transition hover:bg-[var(--brand)]"
          >
            编辑资料
          </Link>
        </div>

        {/* 匹配状态大卡 */}
        <div className="poster-panel mt-5 overflow-hidden"
          style={{ background: "linear-gradient(135deg,var(--ink) 0%,#19151E 46%,var(--c-blue) 46%,var(--c-blue) 63%,var(--love) 63%,var(--love) 100%)" }}>
          {/* 顶部发光条 */}
          <div className="h-3 w-full poster-stripe opacity-40" />
          <div className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fg-4)]">今日匹配机会</p>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-[5rem] font-black leading-none tracking-tight text-[var(--brand)] drop-shadow-[4px_4px_0_var(--ink)]">{matchesLeft}</span>
                  <span className="rounded-full border-2 border-[var(--paper)] bg-[var(--paper)] px-2 text-sm font-black text-[var(--ink)]">/ {dailyMatchLimit}</span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--fg-4)]">每日 {dailyMatchTime} 自动提醒</p>
              </div>
              <button
                type="button"
                onClick={seed}
                disabled={seeding || matchesLeft === 0}
                className="shrink-0 flex flex-col items-center gap-1.5 rounded-2xl border-2 border-[var(--ink)] px-5 py-3.5 text-xs font-black text-black transition hover:-translate-y-1 active:translate-y-0 disabled:opacity-40 disabled:shadow-none"
                style={{
                  background: "var(--brand)",
                  boxShadow: "6px 6px 0 var(--ink)",
                }}
              >
                {seeding ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                )}
                {seeding ? "匹配中" : "开始匹配"}
              </button>
            </div>
            {/* 进度条 */}
            <div className="mt-4 h-3 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${dailyMatchLimit > 0 ? (todayMatchedCount / dailyMatchLimit) * 100 : 0}%`, background: "linear-gradient(90deg,var(--brand),#0EA5E9)" }}
              />
            </div>
          </div>
        </div>

        {/* Alerts */}
        {seedSuccess && <div className="mt-4 luxury-alert luxury-alert-success">✓ 新的匹配已生成，查看下方心动列表</div>}
        {seedError   && <div className="mt-4 luxury-alert luxury-alert-error">{seedError}</div>}
        {seedHint    && <div className="mt-4 luxury-alert luxury-alert-info">{seedHint}</div>}

        {seeding && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--brand)]/20 bg-[var(--brand-light)] px-4 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--brand)]/30 border-t-[var(--brand)]" />
            <p className="text-sm font-medium text-[var(--brand)]">正在扫描真实用户池，计算合拍度…</p>
          </div>
        )}

        {/* ══ 功能入口 ══════════════════════════════════════════ */}
        <div className="mt-7">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--fg-4)]">功能</p>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => {
              const inner = (
                <>
                  {/* 背景光晕 */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20 blur-3xl">
                    <div className="h-40 w-40 rounded-full" style={{ background: f.accent }} />
                  </div>
                  {/* 巨大图标区 — 占满卡片上部 */}
                  <div className="relative flex flex-1 items-center justify-center">
                    <span style={{ fontSize: "5rem", lineHeight: 1, filter: `drop-shadow(0 0 24px ${f.accent}88)` }}>
                      {f.icon}
                    </span>
                  </div>
                  {/* 底部文字 */}
                  <div className="relative mt-2 px-1 pb-1">
                    <p className="text-[13px] font-black tracking-tight text-white">{f.label}</p>
                    <p className="text-[10px] text-white/40">{f.sub}</p>
                  </div>
                  {/* 右上角进入提示 */}
                  <div className="absolute right-3 top-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: `${f.accent}22`, border: `1px solid ${f.accent}44` }}>
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M4 12L12 4M12 4H6M12 4v6" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </>
              );
              const base = "relative flex flex-col overflow-hidden rounded-3xl border-2 border-[var(--ink)] transition hover:-translate-y-1 active:translate-y-0";
              const style: React.CSSProperties = {
                height: 200,
                background: f.bg,
                borderColor: "var(--ink)",
                boxShadow: `7px 7px 0 var(--ink), 0 4px 24px ${f.glow}`,
                padding: "16px 16px 14px",
              };
              if (f.href) return (
                <Link key={f.id} href={f.href} className={base} style={style}>{inner}</Link>
              );
              return (
                <button key={f.id} type="button" onClick={() => setUpdateModalOpen(true)}
                  className={base + " text-left w-full"} style={style}>{inner}</button>
              );
            })}
          </div>
        </div>

        {/* ══ Match 报告 ══════════════════════════════════════ */}
        {searchReport && (
          <div className="mt-7 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--fg-4)]">Match Transparency</p>
              <h2 className="mt-1 text-base font-black text-white">丘比这次怎么找到 TA 的</h2>
              <p className="mt-0.5 text-xs text-[var(--fg-4)]">扫描了 {searchReport.searchedUserCount} 位用户</p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {searchReport.stages.map(s => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <p className="text-sm font-medium text-[var(--fg-2)]">{s.title}</p>
                  <span className="rounded-full bg-[var(--brand-light)] px-2.5 py-0.5 text-xs font-bold text-[var(--brand)]">{s.count}</span>
                </div>
              ))}
            </div>
            {searchReport.matchedUser && (
              <div className="border-t border-[var(--border)] px-5 py-4">
                <p className="mb-3 text-xs font-bold text-[var(--love)]">💘 匹配到</p>
                <div className="flex items-start gap-3">
                  <Avatar src={searchReport.matchedUser.avatarUrl} name={searchReport.matchedUser.name ?? "?"} size={44} />
                  <div className="min-w-0">
                    <p className="font-bold text-white">{searchReport.matchedUser.name ?? "未设置昵称"}</p>
                    <p className="mt-1 text-sm leading-5 text-[var(--fg-3)]">{searchReport.matchedUser.matchReason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ 心动列表 ════════════════════════════════════════ */}
        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--fg-4)]">
              心动列表
              {list.length > 0 && (
                <span className="ml-2 rounded-full bg-[var(--love)]/20 px-1.5 py-0.5 text-[var(--love)]">{list.length}</span>
              )}
            </p>
          </div>

          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-[var(--border-mid)] py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-light)] text-3xl">💚</div>
              <div>
                <p className="font-bold text-white">心动列表还是空的</p>
                <p className="mt-1 text-sm text-[var(--fg-4)]">点击"开始匹配"，丘比来帮你</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
              {list.map((m, i) => (
                <div
                  key={m.id}
                  className={`group flex items-center gap-3 px-4 py-3.5 transition hover:bg-[var(--surface-2)] ${i > 0 ? "border-t border-[var(--border)]" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/matches/${m.id}`)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <div className="relative shrink-0">
                      <Avatar src={m.targetUser.avatarUrl} name={m.targetUser.name ?? "?"} size={48} />
                      {m.unreadCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[var(--surface)] bg-[var(--love)] text-[9px] font-bold text-white">
                          {m.unreadCount > 9 ? "9+" : m.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-white">{m.targetUser.name ?? "未设置昵称"}</p>
                        {m.status === "connected" && (
                          <span className="shrink-0 rounded-full bg-[var(--brand-light)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand)]">已解锁</span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-[var(--fg-4)]">
                        {(m.targetUser.bio || m.matchReason || "—").slice(0, BIO_MAX)}
                        {((m.targetUser.bio || m.matchReason)?.length ?? 0) > BIO_MAX ? "…" : ""}
                      </p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                      className="shrink-0 text-[var(--fg-4)] transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)]">
                      <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button type="button" onClick={() => handleDelete(m.id)}
                    className="shrink-0 rounded-full p-1.5 text-[var(--fg-4)] transition hover:bg-[var(--love)]/10 hover:text-[var(--love)]">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="h-10" />
      </div>

      <UpdateIntroModal open={updateModalOpen} onClose={() => setUpdateModalOpen(false)} />
    </div>
  );
}
