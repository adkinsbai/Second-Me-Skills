"use client";

import { useState } from "react";

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
        ? { email, password, name: name.trim() || "新用户" }
        : { email, password };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.code !== 0) {
        setError(data?.message || "操作失败，请稍后重试");
      } else {
        window.location.href = mode === "register" ? "/onboarding" : redirectTo;
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
    </div>
  );
}
