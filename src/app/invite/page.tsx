"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

type InviteStats = {
  inviteCode: string;
  inviteCount: number;
  rewardTier: number;
  rewardTierName: string;
  invitedUsers: { name: string; usedAt: string }[];
  superLikesEarned: number;
  totalCodesCreated: number;
};

export default function InvitePage() {
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState(&quot;&quot;);
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(&quot;/api/user/invite&quot;, { credentials: &quot;include&quot; })
      .then((r) => r.json())
      .then((result) => {
        if (result.code === 0) {
          setStats(result.data);
        } else {
          setError(result.message || &quot;加载失败&quot;);
        }
      })
      .catch(() => setError(&quot;网络错误&quot;))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    if (!stats) return;
    try {
      await navigator.clipboard.writeText(stats.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyLink = async () => {
    if (!stats) return;
    try {
      const url = `${window.location.origin}/invite?code=${stats.inviteCode}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (!stats) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: &quot;来丘比找对象！&quot;,
          text: `用我的邀请码 ${stats.inviteCode} 注册丘比，获得 3 天 VIP！✨`,
          url: `${window.location.origin}/invite?code=${stats.inviteCode}`,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleRedeem = async () => {
    if (!inputCode.trim()) return;
    setRedeemLoading(true);
    setRedeemMsg(null);
    try {
      const res = await fetch(&quot;/api/user/invite&quot;, {
        method: &quot;POST&quot;,
        headers: { &quot;Content-Type&quot;: &quot;application/json&quot; },
        credentials: &quot;include&quot;,
        body: JSON.stringify({ code: inputCode.trim() }),
      });
      const result = await res.json();
      if (result.code === 0) {
        setRedeemMsg(`✅ ${result.message}`);
        setInputCode(&quot;&quot;);
        // Refresh stats
        const statsRes = await fetch(&quot;/api/user/invite&quot;, { credentials: &quot;include&quot; });
        const statsData = await statsRes.json();
        if (statsData.code === 0) setStats(statsData.data);
      } else {
        setRedeemMsg(`❌ ${result.message}`);
      }
    } catch {
      setRedeemMsg(&quot;❌ 网络错误&quot;);
    } finally {
      setRedeemLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--ink)] border-t-[var(--brand)]" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="page-shell min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-[780px] px-4 py-10 text-center">
          <p className="text-lg font-black text-[var(--ink)]">😕 {error || &quot;暂无数据&quot;}</p>
          <Link
            href="/matches"
            className="mt-4 inline-block rounded-xl border-2 border-[var(--ink)] bg-[var(--brand)] px-4 py-2 text-sm font-black text-[var(--ink)] shadow-[4px_4px_0_var(--ink)]"
          >
            返回主页
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-[480px] px-4 pb-12 pt-6">
        {/* Hero */}
        <section
          className="overflow-hidden rounded-2xl border-2 border-[var(--ink)] shadow-[6px_6px_0_var(--ink)]"
          style={{ background: "linear-gradient(135deg, var(--ink) 0%, #1a1225 50%, var(--c-pink) 100%)" }}
        >
          <div className="h-2 w-full" style={{ background: "repeating-linear-gradient(90deg, var(--brand) 0px, var(--brand) 8px, var(--c-pink) 8px, var(--c-pink) 16px, var(--c-blue) 16px, var(--c-blue) 24px)" }} />
          <div className="p-6 text-center">
            <p className="text-xs font-black tracking-widest text-[var(--paper)]/60" style={{ textTransform: "uppercase" }}>
              Invite Friends
            </p>
            <h1 className="mt-2 text-2xl font-black text-[var(--brand)] drop-shadow-[3px_3px_0_var(--ink)]">
              🎁 邀请好友
            </h1>
            <p className="mt-2 text-sm font-bold text-[var(--paper)]/70">
              分享你的邀请码，邀请好友加入丘比
            </p>
            <p className="mt-1 text-xs font-bold text-[var(--paper)]/50">
              你得 +1 Super Like · 好友得 3 天 VIP
            </p>
          </div>
        </section>

        {/* Invite code card */}
        <section className="mt-6 rounded-2xl border-2 border-[var(--ink)] bg-[var(--card)] p-6 shadow-[6px_6px_0_var(--ink)]">
          <p className="text-xs font-black text-[var(--muted-ink)]">你的专属邀请码</p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="text-3xl font-black tracking-[4px] text-[var(--ink)]">
              {stats.inviteCode}
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCopy}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl border-2 border-[var(--ink)] bg-[var(--brand)] px-3 py-2.5 text-xs font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5 active:translate-y-0"
            >
              {copied ? &quot;✅ 已复制&quot; : &quot;📋 复制码&quot;}
            </button>
            <button
              onClick={handleCopyLink}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl border-2 border-[var(--ink)] bg-[var(--c-blue)] px-3 py-2.5 text-xs font-black text-white shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5 active:translate-y-0"
            >
              🔗 复制链接
            </button>
            <button
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl border-2 border-[var(--ink)] bg-[var(--c-pink)] px-3 py-2.5 text-xs font-black text-white shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5 active:translate-y-0"
            >
              📤 分享
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--card)] p-4 text-center shadow-[4px_4px_0_var(--ink)]">
            <p className="text-2xl font-black text-[var(--brand)]">{stats.inviteCount}</p>
            <p className="mt-1 text-[10px] font-bold text-[var(--muted-ink)]">已邀请</p>
          </div>
          <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--card)] p-4 text-center shadow-[4px_4px_0_var(--ink)]">
            <p className="text-2xl font-black text-[var(--c-pink)]">{stats.superLikesEarned}</p>
            <p className="mt-1 text-[10px] font-bold text-[var(--muted-ink)]">Super Likes</p>
          </div>
          <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--card)] p-4 text-center shadow-[4px_4px_0_var(--ink)]">
            <p className="text-2xl font-black text-[var(--c-blue)]">{stats.rewardTier}</p>
            <p className="mt-1 text-[10px] font-bold text-[var(--muted-ink)]">推荐等级</p>
          </div>
        </section>

        {/* Reward tier */}
        {stats.rewardTierName ? (
          <div className="mt-4 rounded-xl border-2 border-[var(--ink)] bg-[var(--brand)]/20 px-4 py-3 text-center shadow-[3px_3px_0_var(--ink)]">
            <p className="text-sm font-black text-[var(--ink)]">🏆 {stats.rewardTierName}</p>
            <p className="mt-1 text-[10px] font-bold text-[var(--muted-ink)]">
              邀请 3/5/10/20/50 人解锁更高等级
            </p>
          </div>
        ) : null}

        {/* Invited users list */}
        {stats.invitedUsers.length > 0 ? (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-black text-[var(--ink)]">👥 已邀请的好友</h2>
            <div className="space-y-2">
              {stats.invitedUsers.map((u, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border-2 border-[var(--ink)] bg-[var(--card)] px-4 py-2.5 shadow-[3px_3px_0_var(--ink)]"
                >
                  <span className="text-xs font-bold text-[var(--ink)]">{u.name}</span>
                  <span className="text-[10px] font-bold text-[var(--muted-ink)]">
                    {u.usedAt ? new Date(u.usedAt).toLocaleDateString(&quot;zh-CN&quot;) : &quot;&quot;}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Enter someone's invite code */}
        <section className="mt-8 rounded-2xl border-2 border-dashed border-[var(--ink)] bg-[var(--paper-2)] p-5 shadow-[4px_4px_0_var(--ink)]">
          <h2 className="text-sm font-black text-[var(--ink)]">🎫 使用邀请码</h2>
          <p className="mt-1 text-[10px] font-bold text-[var(--muted-ink)]">
            输入好友的邀请码，获得 3 天 VIP
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder=&quot;输入邀请码&quot;
              maxLength={8}
              className=&quot;flex-1 rounded-xl border-2 border-[var(--ink)] bg-white px-4 py-2.5 text-sm font-black text-[var(--ink)] uppercase tracking-widest shadow-[3px_3px_0_var(--ink)] placeholder:text-[var(--muted-ink)] placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-[var(--brand)]&quot;
            />
            <button
              onClick={handleRedeem}
              disabled={redeemLoading || !inputCode.trim()}
              className="rounded-xl border-2 border-[var(--ink)] bg-[var(--brand)] px-5 py-2.5 text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {redeemLoading ? &quot;...&quot; : &quot;兑换&quot;}
            </button>
          </div>
          {redeemMsg ? (
            <p className="mt-2 text-xs font-bold text-[var(--ink)]">{redeemMsg}</p>
          ) : null}
        </section>

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link
            href="/portrait"
            className="inline-flex items-center gap-1 rounded-xl border-2 border-[var(--ink)] bg-[var(--card)] px-5 py-3 text-sm font-black text-[var(--ink)] shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-0.5 active:translate-y-0"
          >
            🪞 查看我的画像
          </Link>
        </div>
      </main>
    </div>
  );
}
