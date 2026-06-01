"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // trigger enter animation
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [message, type, duration, onClose]);

  const bgColor = type === "success" ? "bg-[var(--c-blue)]" : "bg-[var(--love)]";

  return (
    <div
      className={`fixed left-1/2 top-4 z-[9999] -translate-x-1/2 rounded-2xl border-2 border-[var(--ink)] ${bgColor} px-5 py-3 text-sm font-black text-white shadow-[4px_4px_0_var(--ink)] transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
      }`}
    >
      {type === "success" ? "✅ " : "❌ "}
      {message}
    </div>
  );
}
