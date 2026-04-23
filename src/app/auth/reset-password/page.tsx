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
      setError("链接无效，请重新获取");
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
      setError("密码至少 8 位，且包含字母和数字");
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
      if (!res.ok || data?.code !== 0) {
        setError(data?.message || "重置失败，请稍后重试");
      } else {
        setMessage(data?.message || "重置成功，请重新登录");
      }
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell px-4 py-12">
      <div className="glass-card mx-auto w-full max-w-md space-y-4 rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-100/55">Password Reset</p>
        <h1 className="luxury-title text-2xl font-semibold">重置密码</h1>
        <p className="text-sm text-amber-100/70">请设置一个新密码，至少 8 位并包含字母和数字。</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="新密码"
          className="luxury-input w-full rounded-xl px-3 py-2.5 text-sm"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="确认新密码"
          className="luxury-input w-full rounded-xl px-3 py-2.5 text-sm"
        />
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
        {message ? <p className="text-xs text-emerald-300">{message}</p> : null}

        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="luxury-btn w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-70"
        >
          {loading ? "提交中…" : "确认重置"}
        </button>

        <Link href="/auth" className="inline-block text-xs text-amber-100/70 underline underline-offset-2">
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
        <main className="page-shell flex items-center justify-center text-sm luxury-subtitle">
          页面加载中…
        </main>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
