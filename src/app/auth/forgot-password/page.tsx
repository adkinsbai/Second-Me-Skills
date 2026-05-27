"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [debugLink, setDebugLink] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email.trim()) {
      setError("请输入邮箱");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    setDebugLink("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.code !== 0) {
        setError(data?.message || "提交失败，请稍后再试。");
      } else {
        setMessage(data?.message || "如果邮箱存在，我们会发送重置链接。");
        if (data?.debugResetLink) setDebugLink(String(data.debugResetLink));
      }
    } catch {
      setError("网络异常，请稍后再试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell px-4 py-12">
      <div className="glass-card mx-auto w-full max-w-md space-y-4 rounded-2xl p-6">
        <p className="poster-kicker text-[var(--muted-ink)]">Account Recovery</p>
        <h1 className="text-3xl font-black text-[var(--ink)]">找回密码</h1>
        <p className="text-sm font-bold text-[var(--muted-ink)]">输入注册邮箱，我们会生成一个重置链接。</p>

        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="注册邮箱" className="luxury-input w-full px-3 py-2.5 text-sm" />
        {error ? <p className="text-sm font-black text-[var(--love)]">{error}</p> : null}
        {message ? <p className="text-sm font-black text-[var(--ink)]">{message}</p> : null}
        {debugLink ? (
          <Link href={debugLink} className="block text-xs font-black text-[var(--love)] underline underline-offset-2">
            开发模式：点击这里直接重置密码
          </Link>
        ) : null}

        <button type="button" onClick={submit} disabled={loading} className="luxury-btn w-full py-3 text-sm disabled:opacity-70">
          {loading ? "提交中..." : "发送找回链接"}
        </button>

        <Link href="/auth" className="inline-block text-xs font-black text-[var(--muted-ink)] underline underline-offset-2">
          返回登录
        </Link>
      </div>
    </main>
  );
}
