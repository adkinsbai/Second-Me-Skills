"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import data from "@emoji-mart/data";

const Picker = dynamic(() => import("@emoji-mart/react").then((m) => m.default), { ssr: false });

type Props = {
  onEmojiSelect: (emojiNative: string) => void;
  theme?: "light" | "dark" | "auto";
  label?: string;
};

/**
 * 使用开源 emoji-mart（MIT）+ Unicode 数据集，无需自托管图片即可选上千个表情。
 */
export function EmojiMartPopover({ onEmojiSelect, theme = "dark", label = "表情" }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative inline-block" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
        aria-expanded={open}
        aria-label="插入表情"
      >
        {label}
      </button>
      {open ? (
        <div className="absolute bottom-full right-0 z-[80] mb-2 max-h-[min(380px,70vh)] w-[min(352px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/15 bg-[#0c111b] shadow-2xl">
          <Picker
            data={data}
            locale="zh"
            theme={theme}
            onEmojiSelect={(e: { native: string }) => {
              onEmojiSelect(e.native);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
