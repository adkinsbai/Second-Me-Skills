"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { UpdateIntroModal } from "@/components/UpdateIntroModal";

const BIO_MAX = 36;

type MatchItem = {
  id: string;
  status: string;
  targetUser: { id: string; name: string | null; avatarUrl: string | null; bio: string | null };
  totalScore: number | null;
  reachedThreshold: boolean;
  unreadCount: number;
  updatedAt: string;
};

export default function MatchesPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [agentIntro, setAgentIntro] = useState<string>("");
  const [list, setList] = useState<MatchItem[]>([]);
  const [threshold, setThreshold] = useState(80);
  const [dailyMatchTime, setDailyMatchTime] = useState("21:00");
  const [todayMatchedCount, setTodayMatchedCount] = useState(0);
  const [dailyMatchLimit, setDailyMatchLimit] = useState(6);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedHint, setSeedHint] = useState<string | null>(null);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  const load = async () => {
    setSeedError(null);
    setSeedHint(null);
    setLoading(true);
    try {
      const meRes = await fetch("/api/me", { credentials: "include" });
      let meData = await meRes.json();
      if (!meData?.user) {
        await new Promise((r) => setTimeout(r, 350));
        const retryMeRes = await fetch("/api/me", { credentials: "include" });
        meData = await retryMeRes.json().catch(() => ({}));
      }
      if (!meData?.user) {
        setSeedError("登录状态同步中，请稍后重试");
        return;
      }
      const name = meData.user.name || "我";
      setUserName(name);

      fetch("/api/agent/intro/summary", { method: "POST", credentials: "include" })
        .then((r2) => r2.json())
        .then((res) => {
          if (res.code === 0 && res.data?.summary) setAgentIntro(res.data.summary);
          else setAgentIntro("还在加载中的有趣灵魂，暂时保留一点神秘。");
        })
        .catch(() => setAgentIntro("还在加载中的有趣灵魂，暂时保留一点神秘。"));

      const matchRes = await fetch("/api/matches", { credentials: "include" });
      const d = await matchRes.json().catch(() => ({}));
      if (d.code === 401) {
        const again = await fetch("/api/me", { credentials: "include" }).then((r) => r.json());
        if (!again?.user) {
          router.replace("/");
        } else {
          setSeedError("心动列表暂时无法加载，请刷新页面重试");
          setList([]);
        }
        return;
      }
      if (d.code === 0) {
        setList(d.data.list ?? []);
        setThreshold(d.data.heartThreshold ?? 80);
        setDailyMatchTime(d.data.dailyMatchTime ?? "21:00");
        setTodayMatchedCount(Number(d.data.todayMatchedCount ?? 0));
        setDailyMatchLimit(Number(d.data.dailyMatchLimit ?? 6));
      }
    } catch {
      setSeedError("网络异常，请刷新重试");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // 当用户切换回此页面（窗口获得焦点）时，自动重新拉取阈值和匹配列表
  useEffect(() => {
    const handler = () => load();
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handler);
      }
    };
  }, []);

  const handleDelete = (matchId: string) => {
    if (!matchId) return;
    const ok = window.confirm("确定要删除这个匹配对象吗？删除后将无法继续解锁/聊天，也不会再出现在你的主页里。");
    if (!ok) return;
    fetch(`/api/matches/${matchId}`, { method: "DELETE", credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.code === 0) {
          setList((prev) => prev.filter((m) => m.id !== matchId));
        }
      })
      .catch(() => {});
  };

  const seed = () => {
    setSeeding(true);
    setSeedError(null);
    setSeedHint(null);
    setSeedSuccess(false);
    fetch("/api/matches/seed", { method: "POST", credentials: "include" })
      .then((r) => r.json().then((d) => ({ ok: r.ok, status: r.status, d })).catch(() => ({ ok: false, status: r.status, d: {} })))
      .then(({ ok, status, d }) => {
        if (ok && d.code === 0) {
          setSeedSuccess(true);
          const hintParts = [d.data?.message, d.data?.thresholdHint]
            .filter((x) => typeof x === "string" && x.trim().length > 0)
            .map((x) => String(x));
          if (hintParts.length > 0) setSeedHint(hintParts.join(" "));
          load();
          setTimeout(() => setSeedSuccess(false), 3000);
        } else {
          const msg = status === 401 ? "请先登录" : d?.message || "生成失败，请稍后重试";
          setSeedError(msg);
        }
      })
      .catch((e) => {
        setSeedError("网络错误，请稍后重试");
        console.error(e);
      })
      .finally(() => setSeeding(false));
  };

  if (loading) {
    return (
      <main className="page-shell app-container py-10">
        <p className="luxury-subtitle text-sm">加载中…</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <AppHeader backHref="/" title={userName ? `${userName}个人主页` : "个人主页"} />

      <div className="app-container relative z-10 space-y-4 py-8">
        <div className="glass-card flex flex-col gap-2 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-100/50">个人主页</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-amber-100/85">
                每天 {dailyMatchTime} 后，丘比会分批给你送来高匹配人选；上线阶段每日最多 {dailyMatchLimit} 位，慢慢挑，别将就。
              </p>
            </div>
            <div className="luxury-chip shrink-0">小提示：别急，慢慢来</div>
          </div>
        </div>

        <Link
          href="/town"
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-rose-500/50 bg-gradient-to-r from-rose-950/50 to-pink-950/35 px-4 py-3 text-left shadow-lg transition hover:border-rose-400/70 hover:from-rose-950/65"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-100">丘比小镇</p>
            <p className="mt-0.5 text-xs text-amber-100/65">帖子广场、发布找人、小镇消息（与顶栏入口相同）</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-rose-50">进入</span>
        </Link>

        <div className="glass-card flex items-center justify-between rounded-2xl p-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-amber-100/55">我的 Agent 介绍</p>
            <p className="whitespace-pre-wrap text-sm text-amber-100/85">
              {agentIntro || "暂无，点击 Update 完善"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUpdateModalOpen(true)}
            className="luxury-btn-secondary ml-2 shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium"
          >
            Update
          </button>
        </div>

        <p className="text-sm text-amber-100/80">
          当前心动阈值：<strong className="text-amber-200">{threshold}</strong> 分。总分 ≥ 阈值可解锁与对方聊天。
        </p>
        <p className="text-xs text-amber-100/50">
          今日已生成：{todayMatchedCount}/{dailyMatchLimit}（上线阶段已扩容到每日 {dailyMatchLimit} 位）
        </p>

        <div className="glass-card flex items-center justify-between rounded-2xl px-4 py-3">
          <span className="text-xs text-amber-100/60">
            提示：匹配仅面向真实注册用户池；当日额度用完后请明日再试。
          </span>
          <button
            type="button"
            onClick={seed}
            disabled={seeding}
            className="luxury-btn rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {seeding ? "准备中…" : "生成今日推荐"}
          </button>
        </div>

        {seedSuccess && <div className="luxury-alert luxury-alert-success">已生成新的匹配结果</div>}
        {seedError && <div className="luxury-alert luxury-alert-error">{seedError}</div>}
        {seedHint && <div className="luxury-alert luxury-alert-info">{seedHint}</div>}

        {list.length === 0 && (
          <div className="glass-card rounded-2xl border border-dashed border-amber-200/25 p-8 text-center">
            <p className="mb-4 luxury-subtitle">暂无匹配记录</p>
            <button
              type="button"
              onClick={seed}
              disabled={seeding}
              className="luxury-btn rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {seeding ? "准备中…" : "生成今日推荐"}
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((m) => (
            <div
              key={m.id}
              className="glass-card relative flex gap-4 rounded-2xl p-4 transition hover:border-amber-200/40"
            >
              <button
                type="button"
                onClick={() => router.push(`/matches/${m.id}`)}
                className="flex flex-1 gap-4 text-left"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-amber-400/25 to-sky-400/20 ring-1 ring-amber-200/25">
                  {m.targetUser.avatarUrl ? (
                    <img
                      src={m.targetUser.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl text-amber-200/50">
                      {m.targetUser.name?.[0] ?? "?"}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-amber-50">
                      {m.targetUser.name ?? "未设置昵称"}
                    </p>
                    {m.unreadCount > 0 && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]"
                        title={`有 ${m.unreadCount} 条新消息`}
                      />
                    )}
                  </div>
                  <p className="truncate text-xs text-amber-100/55">
                    {(m.targetUser.bio || "—").slice(0, BIO_MAX)}
                    {(m.targetUser.bio?.length ?? 0) > BIO_MAX ? "…" : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {m.totalScore != null && (
                      <span className="luxury-chip text-[11px]">{m.totalScore} 分</span>
                    )}
                    {m.reachedThreshold && (
                      <span className="rounded-full border border-emerald-400/35 bg-emerald-950/40 px-2 py-0.5 text-[11px] font-medium text-emerald-200/95">
                        达阈值
                      </span>
                    )}
                    {m.status === "connected" && (
                      <span className="rounded-full border border-sky-400/35 bg-sky-950/40 px-2 py-0.5 text-[11px] font-medium text-sky-200/95">
                        已解锁
                      </span>
                    )}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                className="absolute right-3 top-2 rounded-full border border-amber-100/20 bg-black/30 px-2 py-0.5 text-[11px] text-amber-100/60 transition hover:border-rose-400/40 hover:text-rose-200"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
      <UpdateIntroModal open={updateModalOpen} onClose={() => setUpdateModalOpen(false)} />
    </main>
  );
}
