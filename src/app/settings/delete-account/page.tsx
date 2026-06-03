"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"soft" | "hard">(&quot;soft&quot;);
  const [confirmText, setConfirmText] = useState(&quot;&quot;);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(&quot;&quot;);
  const [step, setStep] = useState<"choose" | "confirm" | "done">(&quot;choose&quot;);

  const canProceed = password.length > 0;
  const canFinalDelete = confirmText === &quot;DELETE&quot;;

  const handleDelete = async () => {
    if (!canProceed || !canFinalDelete) return;
    setLoading(true);
    setError(&quot;&quot;);
    try {
      const res = await fetch(&quot;/api/user/delete-account&quot;, {
        method: &quot;POST&quot;,
        headers: { &quot;Content-Type&quot;: &quot;application/json&quot; },
        body: JSON.stringify({ password, reason, mode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.code !== 0) {
        setError(data?.message || &quot;操作失败&quot;);
        setLoading(false);
        return;
      }
      setStep(&quot;done&quot;);
    } catch {
      setError(&quot;网络异常，请稍后再试&quot;);
      setLoading(false);
    }
  };

  if (step === &quot;done&quot;) {
    return (
      <div className="page-shell min-h-screen">
        <AppHeader backHref="/profile" title="账号注销" />
        <main className="mx-auto max-w-lg px-4 py-12 text-center">
          <div className="text-6xl mb-6">👋</div>
          <h2 className="text-2xl font-black text-[var(--ink)] mb-3">
            {mode === &quot;soft&quot; ? &quot;账号已注销&quot; : &quot;数据已永久删除&quot;}
          </h2>
          <p className="text-sm text-[var(--muted-ink)] mb-8">
            {mode === &quot;soft&quot;
              ? &quot;你的个人数据已匿名化处理。聊天记录已保留但无法追溯到你。感谢你曾使用丘比。&quot;
              : &quot;你的所有数据已永久删除，无法恢复。感谢你曾使用丘比。&quot;}
          </p>
          <Link
            href="/"
            className="luxury-btn inline-block px-8 py-3 text-sm"
          >
            返回首页
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell min-h-screen">
      <AppHeader backHref="/profile" title="账号注销" />

      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {step === &quot;choose&quot; && (
          <>
            {/* Warning banner */}
            <section className="rounded-2xl border-2 border-[var(--love)] bg-[var(--love)]/10 p-5 shadow-[4px_4px_0_var(--ink)]">
              <div className="flex items-start gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h2 className="text-lg font-black text-[var(--love)]">注销账号前请了解</h2>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--ink)]">
                    <li>• 注销后，你的个人资料、照片将被清除</li>
                    <li>• 你将无法再使用此账号登录</li>
                    <li>• 聊天记录对对方仍可见（但头像和昵称将匿名化）</li>
                    <li>• 永久删除将不可恢复</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Data summary */}
            <section className="glass-card rounded-3xl p-5">
              <p className="text-sm font-black text-[var(--ink)] mb-3">📋 将受影响的数据</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { icon: &quot;👤&quot;, label: &quot;个人资料&quot; },
                  { icon: &quot;📸&quot;, label: &quot;照片与头像&quot; },
                  { icon: &quot;💬&quot;, label: &quot;聊天消息&quot; },
                  { icon: &quot;💝&quot;, label: &quot;匹配记录&quot; },
                  { icon: &quot;🏆&quot;, label: &quot;成就徽章&quot; },
                  { icon: &quot;📝&quot;, label: &quot;个性问答&quot; },
                  { icon: &quot;🔍&quot;, label: &quot;浏览记录&quot; },
                  { icon: &quot;📊&quot;, label: &quot;偏好数据&quot; },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] px-3 py-2 font-bold text-[var(--ink)]"
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Choose mode */}
            <section className="glass-card rounded-3xl p-5 space-y-4">
              <p className="text-sm font-black text-[var(--ink)]">选择注销方式</p>

              <button
                type="button"
                onClick={() => { setMode(&quot;soft&quot;); setStep(&quot;confirm&quot;); }}
                className=&quot;w-full text-left rounded-2xl border-2 border-[var(--ink)] bg-[var(--c-amber)]/10 p-4 shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5&quot;
              >
                <p className="font-black text-[var(--ink)]">🚪 暂时离开（软注销）</p>
                <p className="mt-1 text-xs text-[var(--muted-ink)]">
                  个人数据匿名化，但聊天记录保留。适合暂时不想使用的情况。
                </p>
              </button>

              <button
                type="button"
                onClick={() => { setMode(&quot;hard&quot;); setStep(&quot;confirm&quot;); }}
                className=&quot;w-full text-left rounded-2xl border-2 border-[var(--love)] bg-[var(--love)]/10 p-4 shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5&quot;
              >
                <p className="font-black text-[var(--love)]">🔥 永久删除（硬删除）</p>
                <p className="mt-1 text-xs text-[var(--muted-ink)]">
                  所有数据永久删除，包括聊天记录、匹配历史等，不可恢复。
                </p>
              </button>
            </section>

            <div className="flex justify-center">
              <Link
                href="/profile"
                className="text-sm font-bold text-[var(--muted-ink)] hover:text-[var(--ink)] transition"
              >
                ← 返回个人资料
              </Link>
            </div>
          </>
        )}

        {step === &quot;confirm&quot; && (
          <>
            {/* Confirmation form */}
            <section className="glass-card rounded-3xl p-5 space-y-5">
              <div className="text-center">
                <span className="text-4xl">{mode === &quot;soft&quot; ? &quot;🚪&quot; : &quot;🔥&quot;}</span>
                <h2 className="mt-2 text-lg font-black text-[var(--ink)]">
                  {mode === &quot;soft&quot; ? &quot;确认软注销&quot; : &quot;确认永久删除&quot;}
                </h2>
                <p className="mt-1 text-xs text-[var(--muted-ink)]">
                  {mode === &quot;soft&quot;
                    ? &quot;你的个人数据将被匿名化，聊天记录保留但无法追溯。&quot;
                    : &quot;所有数据将被永久删除，此操作不可逆。&quot;}
                </p>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-[var(--muted-ink)]">
                  输入登录密码确认
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=&quot;你的登录密码&quot;
                  className=&quot;luxury-input w-full px-4 py-3 text-sm&quot;
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-[var(--muted-ink)]">
                  注销原因（选填，帮助我们改进）
                </span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className=&quot;luxury-input w-full px-4 py-3 text-sm&quot;
                >
                  <option value="">请选择原因...</option>
                  <option value="not_useful">找不到合适的人</option>
                  <option value="privacy">隐私顾虑</option>
                  <option value="another_app">换了其他平台</option>
                  <option value="temporary">暂时不用了</option>
                  <option value="other">其他原因</option>
                </select>
              </label>

              {/* Danger zone */}
              <div className="rounded-2xl border-2 border-[var(--love)] bg-[var(--love)]/5 p-4 space-y-3">
                <p className="text-xs font-black text-[var(--love)]">
                  ⚡ 最后确认：请输入 DELETE 以继续
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder='输入 DELETE'
                  className=&quot;luxury-input w-full px-4 py-3 text-sm font-mono&quot;
                />
              </div>

              {error && (
                <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--love)] px-3.5 py-2.5 text-sm font-bold text-white">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(&quot;choose&quot;); setError(&quot;&quot;); setPassword(&quot;&quot;); setConfirmText(&quot;&quot;); }}
                  className=&quot;luxury-btn-secondary flex-1 py-3 text-sm&quot;
                >
                  返回
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!canProceed || !canFinalDelete || loading}
                  className="flex-1 rounded-2xl border-2 border-[var(--ink)] bg-[var(--love)] py-3 text-sm font-black text-white shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  {loading ? &quot;处理中...&quot; : &quot;确认注销&quot;}
                </button>
              </div>
            </section>

            <p className="text-center text-[10px] text-[var(--muted-ink)]">
              依据《个人信息保护法》第四十七条，你有权要求删除个人信息。
            </p>
          </>
        )}
      </main>
    </div>
  );
}
