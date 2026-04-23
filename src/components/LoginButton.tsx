"use client";

import { useState } from "react";
import Link from "next/link";

type LoginButtonProps = {
  redirectTo?: string;
};

export function LoginButton({ redirectTo = "/" }: LoginButtonProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const submit = async () => {
    if (!email.trim()) {
      setError("请输入邮箱");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }
    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("两次输入的密码不一致");
        return;
      }
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        setError("密码至少 8 位，且包含字母和数字");
        return;
      }
    }
    setLoading(true);
    setError("");
    const url = mode === "register" ? "/api/auth/register" : "/api/auth/local-login";
    const body =
      mode === "register"
        ? { email, password, name: name.trim() || "新用户", rememberMe }
        : { email, password, rememberMe };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const raw = await res.text();
      let data: { code?: number; message?: string } | null = null;
      try {
        data = raw ? (JSON.parse(raw) as { code?: number; message?: string }) : null;
      } catch {
        data = null;
      }
      if (!res.ok || data?.code !== 0) {
        const fallback =
          !data && res.status >= 500
            ? `服务器错误 (${res.status})，请查看终端/服务端日志`
            : "操作失败，请稍后重试";
        setError(data?.message || fallback);
      } else {
        window.location.href = mode === "register" ? "/onboarding" : redirectTo;
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const guestLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      const raw = await res.text();
      let data: { code?: number; message?: string } | null = null;
      try {
        data = raw ? (JSON.parse(raw) as { code?: number; message?: string }) : null;
      } catch {
        data = null;
      }
      if (!res.ok || data?.code !== 0) {
        const fallback =
          !data && res.status >= 500
            ? `服务器错误 (${res.status})，请查看终端/服务端日志`
            : "免登录进入失败，请稍后重试";
        setError(data?.message || fallback);
      } else {
        window.location.href = redirectTo;
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card mx-auto w-full max-w-md space-y-3 rounded-2xl p-5">
      <div className="mb-1">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-100/55">Member Access</p>
      </div>
      <div className="flex rounded-xl border border-amber-100/20 bg-black/20 p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${
            mode === "login" ? "bg-amber-100/15 text-amber-50 shadow-sm" : "text-amber-100/60 hover:text-amber-100/85"
          }`}
        >
          邮箱登录
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${
            mode === "register" ? "bg-amber-100/15 text-amber-50 shadow-sm" : "text-amber-100/60 hover:text-amber-100/85"
          }`}
        >
          注册账号
        </button>
      </div>

      {mode === "register" && (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="昵称（可选）"
          className="luxury-input w-full rounded-xl px-3 py-2.5 text-sm"
        />
      )}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="邮箱"
        className="luxury-input w-full rounded-xl px-3 py-2.5 text-sm"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="密码（至少 8 位，含字母+数字）"
        className="luxury-input w-full rounded-xl px-3 py-2.5 text-sm"
      />
      {mode === "register" && (
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="确认密码"
          className="luxury-input w-full rounded-xl px-3 py-2.5 text-sm"
        />
      )}
      {mode === "login" && (
        <div className="flex items-center justify-between text-xs">
          <label className="inline-flex cursor-pointer items-center gap-2 text-amber-100/75">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="accent-amber-400"
            />
            记住密码（30 天）
          </label>
          <Link href="/auth/forgot-password" className="text-amber-200 underline underline-offset-2">
            忘记密码？
          </Link>
        </div>
      )}
      {error && <p className="text-xs text-rose-300">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="luxury-btn inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold"
      >
        {loading ? "处理中…" : mode === "register" ? "注册并进入" : "登录并进入"}
      </button>

      <a
        href="/api/auth/login"
        className="luxury-btn-secondary inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm"
      >
        或使用 SecondMe 登录
      </a>

      <button
        type="button"
        onClick={guestLogin}
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm text-amber-100/90 transition hover:bg-white/10 disabled:opacity-70"
      >
        免登录先逛逛
      </button>
    </div>
  );
}
