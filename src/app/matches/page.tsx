"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { UpdateIntroModal } from "@/components/UpdateIntroModal";

const BIO_MAX = 72;

type MeUser = {
  id: string;
  name: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

type MatchItem = {
  id: string;
  status: string;
  targetUser: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    bio: string | null;
  };
  matchReason: string;
  unreadCount: number;
};

type MatchSearchReport = {
  searchedUserCount: number;
  stages: { id: string; title: string; detail: string; count: number }[];
  matchedUser?: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    bio: string | null;
    matchReason: string;
  } | null;
};

function displayName(user: MeUser): string {
  const name = user.name?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email.split("@")[0] || "用户";
  return user.id ? `用户 ${user.id.slice(-6)}` : "用户";
}

function Avatar({ src, name, size = 48 }: { src?: string | null; name: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, minWidth: size }}
      className="relative overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[var(--brand)] shadow-[4px_4px_0_var(--ink)]"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name || 'avatar'} className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center font-black text-[var(--ink)]" style={{ fontSize: size * 0.36 }}>
          {(name?.[0] ?? "?").toUpperCase()}
        </div>
      )}
    </div>
  );
}

const FEATURES = [
  {
    id: "discover",
    href: "/discover" as string | null,
    label: "翻牌发现",
    sub: "从候选人里继续探索",
    color: "var(--c-blue)",
    mark: "D",
  },
  {
    id: "town",
    href: "/town" as string | null,
    label: "丘比小镇",
    sub: "发布需求，找搭子",
    color: "var(--love)",
    mark: "T",
  },
  {
    id: "agent",
    href: null as string | null,
    label: "我的 Agent",
    sub: "完善资料与自我介绍",
    color: "var(--c-purple)",
    mark: "A",
  },
  {
    id: "settings",
    href: "/settings/heartbeat" as string | null,
    label: "匹配偏好",
    sub: "关系类型、节奏与活动",
    color: "var(--c-amber)",
    mark: "P",
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
    setSeedError(null);
    setSeedHint(null);
    setLoading(true);
    try {
      let meData = await fetch("/api/me", { credentials: "include" }).then((response) => response.json());
      if (!meData?.user) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        meData = await fetch("/api/me", { credentials: "include" }).then((response) => response.json()).catch(() => ({}));
      }
      if (!meData?.user) {
        setSeedError("登录状态同步中，请稍后再试。");
        return;
      }

      const me = meData.user as MeUser;
      setUserName(displayName(me));
      setUserAvatar(me.avatarUrl ?? null);

      fetch("/api/agent/intro/summary", { method: "POST", credentials: "include" })
        .then((response) => response.json())
        .then((result) => setAgentIntro(result.code === 0 && result.data?.summary ? result.data.summary : ""))
        .catch(() => {});

      const result = await fetch("/api/matches", { credentials: "include" }).then((response) => response.json()).catch(() => ({}));
      if (result.code === 401) {
        router.replace("/");
        return;
      }
      if (result.code === 0) {
        setList(result.data.list ?? []);
        setDailyMatchTime(result.data.dailyMatchTime ?? "21:00");
        setTodayMatchedCount(Number(result.data.todayMatchedCount ?? 0));
        setDailyMatchLimit(Number(result.data.dailyMatchLimit ?? 3));
      }
    } catch {
      setSeedError("网络异常，请刷新重试。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = (id: string) => {
    if (!window.confirm("确定删除这个匹配吗？")) return;
    fetch(`/api/matches/${id}`, { method: "DELETE", credentials: "include" })
      .then((response) => response.json())
      .then((result) => {
        if (result.code === 0) setList((prev) => prev.filter((item) => item.id !== id));
      })
      .catch(() => {});
  };

  const seed = () => {
    setSeeding(true);
    setSeedError(null);
    setSeedHint(null);
    setSeedSuccess(false);
    setSearchReport(null);

    fetch("/api/matches/seed", { method: "POST", credentials: "include" })
      .then((response) =>
        response
          .json()
          .then((data) => ({ ok: response.ok, status: response.status, data }))
          .catch(() => ({ ok: false, status: response.status, data: {} }))
      )
      .then(({ ok, status, data }) => {
        if (ok && data.code === 0) {
          setSeedSuccess(true);
          if (data.data?.pipeline) {
            setSearchReport({
              searchedUserCount: Number(data.data.pipeline.searchedUserCount ?? 0),
              stages: data.data.pipeline.stages ?? [],
              matchedUser: data.data.matchedUser ?? null,
            });
          }
          if (typeof data.data?.message === "string" && data.data.message.trim()) setSeedHint(data.data.message.trim());
          load();
          setTimeout(() => setSeedSuccess(false), 5000);
        } else {
          setSeedError(status === 401 ? "请先登录。" : data?.message || "匹配失败，请稍后再试。");
        }
      })
      .catch(() => setSeedError("网络错误，请稍后再试。"))
      .finally(() => setSeeding(false));
  };

  const matchesLeft = Math.max(0, dailyMatchLimit - todayMatchedCount);
  const progress = dailyMatchLimit > 0 ? Math.min(100, (todayMatchedCount / dailyMatchLimit) * 100) : 0;

  if (loading) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--ink)] border-t-[var(--brand)]" />
      </div>
    );
  }

  return (
    <div className="page-shell min-h-screen">
      <AppHeader />

      <main className="relative mx-auto max-w-[780px] px-4 pb-10 pt-6">
        <section className="poster-panel flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar src={userAvatar} name={userName} size={52} />
            <div className="min-w-0">
              <p className="poster-kicker">Qiubi Match Desk</p>
              <h1 className="truncate text-xl font-black text-[var(--paper)]">你好，{userName || "用户"}</h1>
              {agentIntro ? <p className="mt-1 truncate text-xs font-bold text-[var(--brand)]">{agentIntro}</p> : null}
            </div>
          </div>
          <Link
            href="/profile"
            className="shrink-0 rounded-xl border-2 border-[var(--ink)] bg-[var(--c-amber)] px-3.5 py-2 text-xs font-black text-[var(--ink)] shadow-[4px_4px_0_var(--ink)] transition hover:bg-[var(--brand)]"
          >
            编辑资料
          </Link>
        </section>

        <section
          className="poster-panel mt-5 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg,var(--ink) 0%,#19151E 46%,var(--c-blue) 46%,var(--c-blue) 63%,var(--love) 63%,var(--love) 100%)",
          }}
        >
          <div className="h-3 w-full poster-stripe opacity-50" />
          <div className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="poster-kicker text-[var(--paper)]">今日匹配机会</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-[5rem] font-black leading-none text-[var(--brand)] drop-shadow-[4px_4px_0_var(--ink)]">
                    {matchesLeft}
                  </span>
                  <span className="mb-2 rounded-full border-2 border-[var(--paper)] bg-[var(--paper)] px-2 py-0.5 text-sm font-black text-[var(--ink)]">
                    / {dailyMatchLimit}
                  </span>
                </div>
                <p className="mt-1 text-sm font-bold text-[var(--paper)]">
                  每日 {dailyMatchTime} 按你的偏好刷新推荐
                </p>
              </div>
              <button
                type="button"
                onClick={seed}
                disabled={seeding || matchesLeft === 0}
                className="shrink-0 rounded-2xl border-2 border-[var(--ink)] bg-[var(--brand)] px-5 py-4 text-sm font-black text-[var(--ink)] shadow-[6px_6px_0_var(--ink)] transition hover:-translate-y-1 active:translate-y-0 disabled:translate-y-0 disabled:opacity-45 disabled:shadow-none"
              >
                {seeding ? "匹配中..." : matchesLeft === 0 ? "今日已用完" : "开始匹配"}
              </button>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg,var(--brand),var(--c-amber))" }}
              />
            </div>
          </div>
        </section>

        {seedSuccess ? <div className="mt-4 luxury-alert luxury-alert-success text-center">新的匹配已生成，看看下面的匹配列表。</div> : null}
        {seedError ? <div className="mt-4 luxury-alert luxury-alert-error text-center">{seedError}</div> : null}
        {seedHint ? <div className="mt-4 luxury-alert luxury-alert-info text-center">{seedHint}</div> : null}

        {seeding ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-[var(--ink)] bg-[var(--brand)] px-4 py-3 text-[var(--ink)] shadow-[4px_4px_0_var(--ink)]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ink)] border-t-transparent" />
            <p className="text-sm font-black">正在扫描候选用户池，并计算合拍程度。</p>
          </div>
        ) : null}

        <section className="mt-7">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--muted-ink)]">功能入口</p>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((feature) => {
              const content = (
                <>
                  <div
                    className="absolute -right-5 -top-5 flex h-24 w-24 rotate-12 items-center justify-center border-2 border-[var(--ink)] text-5xl font-black text-[var(--ink)] opacity-90"
                    style={{ background: feature.color }}
                  >
                    {feature.mark}
                  </div>
                  <div className="relative mt-auto">
                    <p className="text-lg font-black text-[var(--paper)]">{feature.label}</p>
                    <p className="mt-1 text-xs font-bold text-[var(--paper)]/75">{feature.sub}</p>
                  </div>
                </>
              );
              const className =
                "relative flex h-36 overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[var(--ink)] p-4 text-left shadow-[6px_6px_0_var(--ink)] transition hover:-translate-y-1";
              return feature.href ? (
                <Link key={feature.id} href={feature.href} className={className}>
                  {content}
                </Link>
              ) : (
                <button key={feature.id} type="button" onClick={() => setUpdateModalOpen(true)} className={className}>
                  {content}
                </button>
              );
            })}
          </div>
        </section>

        {searchReport ? (
          <section className="poster-panel mt-7 overflow-hidden p-0">
            <div className="border-b-2 border-[var(--ink)] p-5">
              <p className="poster-kicker">Match Transparency</p>
              <h2 className="mt-2 text-2xl font-black text-[var(--brand)]">这次丘比如何找到 TA</h2>
              <p className="mt-1 text-sm font-bold text-[var(--paper)]">
                本轮扫描 {searchReport.searchedUserCount} 位候选用户。
              </p>
            </div>
            <div className="divide-y-2 divide-[var(--ink)]">
              {searchReport.stages.map((stage) => (
                <div key={stage.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[var(--paper)]">{stage.title}</p>
                    <p className="truncate text-xs font-bold text-[var(--paper)]/65">{stage.detail}</p>
                  </div>
                  <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--brand)] px-3 py-1 text-xs font-black text-[var(--ink)]">
                    {stage.count}
                  </span>
                </div>
              ))}
            </div>
            {searchReport.matchedUser ? (
              <div className="border-t-2 border-[var(--ink)] p-5">
                <p className="mb-3 text-xs font-black text-[var(--love)]">已匹配到</p>
                <div className="flex items-start gap-3">
                  <Avatar src={searchReport.matchedUser.avatarUrl} name={searchReport.matchedUser.name ?? "?"} size={48} />
                  <div className="min-w-0">
                    <p className="font-black text-[var(--paper)]">{searchReport.matchedUser.name ?? "未设置昵称"}</p>
                    <p className="mt-1 text-sm font-bold leading-6 text-[var(--paper)]/75">
                      {searchReport.matchedUser.matchReason}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--muted-ink)]">
              匹配列表
              {list.length > 0 ? <span className="ml-2 rounded-full bg-[var(--love)] px-2 py-0.5 text-white">{list.length}</span> : null}
            </p>
          </div>

          {list.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-[var(--ink)] bg-[var(--paper)] px-6 py-14 text-center shadow-[6px_6px_0_var(--ink)]">
              <p className="text-lg font-black text-[var(--ink)]">匹配列表还是空的</p>
              <p className="mt-2 text-sm font-bold text-[var(--muted-ink)]">
                点击“开始匹配”，让丘比先帮你挑出最值得认识的人。
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[8px_8px_0_var(--ink)]">
              {list.map((match, index) => (
                <div
                  key={match.id}
                  className={`group flex items-center gap-3 px-4 py-4 transition hover:bg-[var(--paper-2)] ${
                    index > 0 ? "border-t-2 border-[var(--ink)]" : ""
                  }`}
                >
                  <button type="button" onClick={() => router.push(`/matches/${match.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <div className="relative shrink-0">
                      <Avatar src={match.targetUser.avatarUrl} name={match.targetUser.name ?? "?"} size={50} />
                      {match.unreadCount > 0 ? (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--love)] px-1 text-[10px] font-black text-white">
                          {match.unreadCount > 9 ? "9+" : match.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-black text-[var(--ink)]">{match.targetUser.name ?? "未设置昵称"}</p>
                        {match.status === "connected" ? (
                          <span className="shrink-0 rounded-full bg-[var(--brand)] px-2 py-0.5 text-[10px] font-black text-[var(--ink)]">
                            已连接
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-sm font-bold text-[var(--muted-ink)]">
                        {(match.targetUser.bio || match.matchReason || "查看这次合拍理由").slice(0, BIO_MAX)}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(match.id)}
                    className="shrink-0 rounded-xl border-2 border-transparent p-2 text-[var(--muted-ink)] transition hover:border-[var(--ink)] hover:bg-[var(--love)] hover:text-white"
                    aria-label="删除匹配"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <UpdateIntroModal open={updateModalOpen} onClose={() => setUpdateModalOpen(false)} />
    </div>
  );
}
