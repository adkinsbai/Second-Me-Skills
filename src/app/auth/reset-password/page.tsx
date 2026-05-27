"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    if (!token) {
      setError("链接无效，请重新获取。");
      return;
    }
    if (!password) {
      setError("请输入新密码");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("密码至少 8 位，并包含字母和数字");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.code !== 0) setError(data?.message || "重置失败，请稍后再试。");
      else setMessage(data?.message || "重置成功，请重新登录。");
    } catch {
      setError("网络异常，请稍后再试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell px-4 py-12">
      <div className="glass-card mx-auto w-full max-w-md space-y-4 rounded-2xl p-6">
        <p className="poster-kicker text-[var(--muted-ink)]">Password Reset</p>
        <h1 className="text-3xl font-black text-[var(--ink)]">重置密码</h1>
        <p className="text-sm font-bold text-[var(--muted-ink)]">请设置一个至少 8 位、包含字母和数字的新密码。</p>

        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="新密码" className="luxury-input w-full px-3 py-2.5 text-sm" />
        <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="确认新密码" className="luxury-input w-full px-3 py-2.5 text-sm" />
        {error ? <p className="text-sm font-black text-[var(--love)]">{error}</p> : null}
        {message ? <p className="text-sm font-black text-[var(--ink)]">{message}</p> : null}

        <button type="button" onClick={submit} disabled={loading} className="luxury-btn w-full py-3 text-sm disabled:opacity-70">
          {loading ? "提交中..." : "确认重置"}
        </button>

        <Link href="/auth" className="inline-block text-xs font-black text-[var(--muted-ink)] underline underline-offset-2">
          返回登录
        </Link>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="page-shell flex min-h-screen items-center justify-center text-sm font-black text-[var(--ink)]">
          页面加载中...
        </main>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
