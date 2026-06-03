"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"soft" | "hard">("soft");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"choose" | "confirm" | "done">("choose");

  const canProceed = password.length > 0;
  const canFinalDelete = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!canProceed || !canFinalDelete) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, reason, mode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.code !== 0) {
        setError(data?.message || "操作失败");
        setLoading(false);
        return;
      }
      setStep("done");
    } catch {
      setError("网络异常，请稍后再试");
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="page-shell min-h-screen">
        <AppHeader backHref="/profile" title="账号注销" />
        <main className="mx-auto max-w-lg px-4 py-12 text-center">
          <div className="text-6xl mb-6">👋</div>
          <h2 className="text-2xl font-black text-[var(--ink)] mb-3">
            {mode === "soft" ? "账号已注销" : "数据已永久删除"}
          </h2>
          <p className="text-sm text-[var(--muted-ink)] mb-8">
            {mode === "soft"
              ? "你的个人数据已匿名化处理。聊天记录已保留但无法追溯到你。感谢你曾使用丘比。"
              : "你的所有数据已永久删除，无法恢复。感谢你曾使用丘比。"}
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
        {step === "choose" && (
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
                  { icon: "👤", label: "个人资料" },
                  { icon: "📸", label: "照片与头像" },
                  { icon: "💬", label: "聊天消息" },
                  { icon: "💝", label: "匹配记录" },
                  { icon: "🏆", label: "成就徽章" },
                  { icon: "📝", label: "个性问答" },
                  { icon: "🔍", label: "浏览记录" },
                  { icon: "📊", label: "偏好数据" },
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
                onClick={() => { setMode("soft"); setStep("confirm"); }}
                className="w-full text-left rounded-2xl border-2 border-[var(--ink)] bg-[var(--c-amber)]/10 p-4 shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5"
              >
                <p className="font-black text-[var(--ink)]">🚪 暂时离开（软注销）</p>
                <p className="mt-1 text-xs text-[var(--muted-ink)]">
                  个人数据匿名化，但聊天记录保留。适合暂时不想使用的情况。
                </p>
              </button>

              <button
                type="button"
                onClick={() => { setMode("hard"); setStep("confirm"); }}
                className="w-full text-left rounded-2xl border-2 border-[var(--love)] bg-[var(--love)]/10 p-4 shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5"
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

        {step === "confirm" && (
          <>
            {/* Confirmation form */}
            <section className="glass-card rounded-3xl p-5 space-y-5">
              <div className="text-center">
                <span className="text-4xl">{mode === "soft" ? "🚪" : "🔥"}</span>
                <h2 className="mt-2 text-lg font-black text-[var(--ink)]">
                  {mode === "soft" ? "确认软注销" : "确认永久删除"}
                </h2>
                <p className="mt-1 text-xs text-[var(--muted-ink)]">
                  {mode === "soft"
                    ? "你的个人数据将被匿名化，聊天记录保留但无法追溯。"
                    : "所有数据将被永久删除，此操作不可逆。"}
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
                  placeholder="你的登录密码"
                  className="luxury-input w-full px-4 py-3 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-[var(--muted-ink)]">
                  注销原因（选填，帮助我们改进）
                </span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="luxury-input w-full px-4 py-3 text-sm"
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
                  className="luxury-input w-full px-4 py-3 text-sm font-mono"
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
                  onClick={() => { setStep("choose"); setError(""); setPassword(""); setConfirmText(""); }}
                  className="luxury-btn-secondary flex-1 py-3 text-sm"
                >
                  返回
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!canProceed || !canFinalDelete || loading}
                  className="flex-1 rounded-2xl border-2 border-[var(--ink)] bg-[var(--love)] py-3 text-sm font-black text-white shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  {loading ? "处理中..." : "确认注销"}
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
