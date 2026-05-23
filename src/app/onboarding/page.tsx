"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return") || "/";

  const [privacy, setPrivacy] = useState(false);
  const [learn, setLearn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const finish = async () => {
    if (!privacy) {
      setError("请先勾选同意隐私说明");
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
        setError(data?.message || "保存失败，请重试");
        setSubmitting(false);
        return;
      }
      const nextReturn = returnTo.startsWith("/") ? returnTo : "/";
      window.location.href = `/onboarding/paradise?return=${encodeURIComponent(nextReturn)}`;
    } catch {
      setError("网络异常，请重试");
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell px-4 py-10">
      <div className="glass-card mx-auto max-w-lg space-y-6 rounded-2xl p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gray-400">Welcome</p>
          <h1 className="luxury-title mt-2 text-xl font-semibold">欢迎来到丘比</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            花 1 分钟了解我们在做什么：丘比会基于双方
            <strong className="text-amber-100/95">真实资料与信息库</strong>判断合拍度，只把更值得认识的人带到你面前。匹配引擎会综合人格向量、沟通节奏、价值观等维度做推荐。
          </p>
        </div>

        <div className="luxury-alert luxury-alert-info text-sm">
          <p className="font-medium">你将能使用</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>心动设置与每日推荐（真实用户池匹配）</li>
            <li>匹配后直接进入真人聊天、关系沉淀与对方主页</li>
            <li>查看丘比写给你们的故事开场</li>
          </ul>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-1 accent-amber-400"
            checked={privacy}
            onChange={(e) => setPrivacy(e.target.checked)}
          />
          <span>
            我已阅读并同意
            <Link href="/privacy" className="mx-1 text-[var(--brand-text)] underline underline-offset-2">
              《隐私与数据说明》
            </Link>
            ：丘比会处理你主动填写的资料与聊天内容，用于匹配与产品改进；你可随时在设置中撤回授权。
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rose-400/25 bg-rose-950/25 p-3 text-sm text-gray-700">
          <input type="checkbox" className="mt-1 accent-rose-400" checked={learn} onChange={(e) => setLearn(e.target.checked)} />
          <span>
            允许我的专属 Agent <strong className="text-gray-900">学习我在真人聊天中的表达习惯与情绪方式</strong>（写入本地信息库，用于更懂我与更准匹配）。可随时关闭。
          </span>
        </label>

        {error ? <p className="text-xs text-rose-300">{error}</p> : null}

        <button
          type="button"
          onClick={finish}
          disabled={submitting}
          className="luxury-btn w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
        >
          {submitting ? "保存中…" : "进入丘比"}
        </button>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="page-shell flex items-center justify-center text-sm luxury-subtitle">加载中…</main>
      }
    >
      <OnboardingInner />
    </Suspense>
  );
}
