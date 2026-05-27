"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function OnboardingInner() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return") || "/";
  const [privacy, setPrivacy] = useState(false);
  const [learn, setLearn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const finish = async () => {
    if (!privacy) {
      setError("请先阅读并同意隐私与数据说明。");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ privacyAccepted: true, agentLearnConsent: learn }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.code !== 0) {
        setError(data?.message || "保存失败，请重试。");
        setSubmitting(false);
        return;
      }
      const nextReturn = returnTo.startsWith("/") ? returnTo : "/";
      window.location.href = `/onboarding/paradise?return=${encodeURIComponent(nextReturn)}`;
    } catch {
      setError("网络异常，请重试。");
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell px-4 py-10">
      <div className="glass-card mx-auto max-w-lg space-y-6 rounded-2xl p-6">
        <div>
          <p className="poster-kicker text-[var(--muted-ink)]">Welcome</p>
          <h1 className="mt-2 text-3xl font-black text-[var(--ink)]">欢迎来到丘比</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-[var(--muted-ink)]">
            丘比会基于你主动填写的资料、偏好和真实互动来理解合拍程度，只把更值得认识的人推荐给你。
          </p>
        </div>

        <div className="luxury-alert luxury-alert-info text-sm font-bold">
          <p className="font-black">你将能使用：</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>每日匹配与翻牌发现</li>
            <li>匹配后的真实聊天、关系沉淀与对方主页</li>
            <li>丘比写给你们的合拍报告和开场建议</li>
          </ul>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] p-3 text-sm font-bold text-[var(--muted-ink)]">
          <input type="checkbox" className="mt-1 accent-[var(--brand)]" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} />
          <span>
            我已阅读并同意
            <Link href="/privacy" className="mx-1 font-black text-[var(--love)] underline underline-offset-2">
              《隐私与数据说明》
            </Link>
            。丘比会处理你主动填写的资料和互动内容，用于匹配与产品改进。
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-3 text-sm font-bold text-[var(--muted-ink)]">
          <input type="checkbox" className="mt-1 accent-[var(--love)]" checked={learn} onChange={(event) => setLearn(event.target.checked)} />
          <span>
            允许我的专属 Agent 学习我在真实聊天中的表达习惯和相处方式，用于更懂我和更准确的推荐。可后续关闭。
          </span>
        </label>

        {error ? <p className="text-sm font-black text-[var(--love)]">{error}</p> : null}

        <button type="button" onClick={finish} disabled={submitting} className="luxury-btn w-full py-3 text-sm disabled:opacity-60">
          {submitting ? "保存中..." : "进入丘比"}
        </button>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="page-shell flex min-h-screen items-center justify-center text-sm font-black text-[var(--ink)]">
          加载中...
        </main>
      }
    >
      <OnboardingInner />
    </Suspense>
  );
}
