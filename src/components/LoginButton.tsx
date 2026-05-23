"use client";

import { useState } from "react";
import Link from "next/link";

export function LoginButton({ redirectTo = "/" }: { redirectTo?: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const submit = async () => {
    if (!email.trim()) { setError("请输入邮箱"); return; }
    if (!password) { setError("请输入密码"); return; }
    if (mode === "register") {
      if (!name.trim()) { setError("请填写你的昵称"); return; }
      if (password !== confirmPassword) { setError("两次密码不一致"); return; }
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        setError("密码至少 8 位，含字母和数字"); return;
      }
    }
    setLoading(true); setError("");
    const url = mode === "register" ? "/api/auth/register" : "/api/auth/local-login";
    const body = mode === "register" ? { email, password, name: name.trim(), rememberMe } : { email, password, rememberMe };
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const raw = await res.text();
      let data: { code?: number; message?: string } | null = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
      if (!res.ok || data?.code !== 0) setError(data?.message || (res.status >= 500 ? `服务器错误 (${res.status})` : "操作失败"));
      else window.location.href = mode === "register" ? "/onboarding/questionnaire" : redirectTo;
    } catch { setError("网络错误，请重试"); } finally { setLoading(false); }
  };

  const guestLogin = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.code !== 0) setError(data?.message || "免登录失败");
      else window.location.href = redirectTo;
    } catch { setError("网络错误"); } finally { setLoading(false); }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--border-mid)] bg-[var(--surface)]">
      {/* 顶部彩色线 */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg,var(--brand),#5B9EFF,var(--love))" }} />

      <div className="p-5 space-y-4">
        {/* Tab */}
        <div className="flex rounded-2xl bg-[var(--surface-2)] p-1">
          {(["login", "register"] as const).map(m => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 rounded-xl py-2 text-sm font-bold transition ${mode === m ? "bg-[var(--surface-3)] text-white shadow-sm" : "text-[var(--fg-4)] hover:text-[var(--fg-3)]"}`}>
              {m === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="space-y-2.5">
          {mode === "register" && (
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="昵称（必填）"
              className="luxury-input w-full px-4 py-3 text-sm" />
          )}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="邮箱"
            className="luxury-input w-full px-4 py-3 text-sm" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder={mode === "register" ? "密码（≥8 位，含字母+数字）" : "密码"}
            className="luxury-input w-full px-4 py-3 text-sm" />
          {mode === "register" && (
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="确认密码"
              className="luxury-input w-full px-4 py-3 text-sm" />
          )}
        </div>

        {mode === "login" && (
          <div className="flex items-center justify-between text-xs">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[var(--fg-4)]">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="accent-[var(--brand)]" />
              记住我（30 天）
            </label>
            <Link href="/auth/forgot-password" className="text-[var(--brand)] hover:underline">忘记密码？</Link>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-[var(--love)]/10 px-3.5 py-2.5 text-sm text-[var(--love)]">{error}</div>
        )}

        <button type="button" onClick={submit} disabled={loading}
          className="luxury-btn inline-flex w-full items-center justify-center py-3.5 text-sm disabled:opacity-40">
          {loading ? "处理中…" : mode === "register" ? "创建账号" : "登录"}
        </button>

        <a href="/api/auth/login"
          className="inline-flex w-full items-center justify-center rounded-full border border-[var(--border-mid)] py-3 text-sm font-medium text-[var(--fg-3)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
          使用 SecondMe 登录
        </a>

        <button type="button" onClick={guestLogin} disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-full border border-dashed border-[var(--border)] py-3 text-sm text-[var(--fg-4)] transition hover:border-[var(--brand)]/40 hover:text-[var(--fg-3)] disabled:opacity-50">
          先逛逛（无需注册）
        </button>
      </div>
    </div>
  );
}
