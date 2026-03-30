"use client";

import type { CSSProperties } from "react";

/** 浪漫氛围：自下而上飘动的心形（纯 CSS，无 WebGL） */
const HEARTS: { left: string; delay: string; duration: string; drift: string; size: string }[] = [
  { left: "6%", delay: "0s", duration: "15s", drift: "-12px", size: "22px" },
  { left: "14%", delay: "2.5s", duration: "19s", drift: "18px", size: "18px" },
  { left: "24%", delay: "5s", duration: "17s", drift: "6px", size: "26px" },
  { left: "34%", delay: "1s", duration: "21s", drift: "-20px", size: "20px" },
  { left: "44%", delay: "7s", duration: "16s", drift: "14px", size: "24px" },
  { left: "54%", delay: "3s", duration: "18s", drift: "-8px", size: "19px" },
  { left: "64%", delay: "9s", duration: "20s", drift: "22px", size: "27px" },
  { left: "74%", delay: "2s", duration: "17s", drift: "-16px", size: "17px" },
  { left: "84%", delay: "6s", duration: "22s", drift: "10px", size: "23px" },
  { left: "92%", delay: "4s", duration: "18s", drift: "-6px", size: "21px" },
  { left: "18%", delay: "11s", duration: "23s", drift: "16px", size: "20px" },
  { left: "48%", delay: "8s", duration: "16s", drift: "-14px", size: "25px" },
  { left: "78%", delay: "12s", duration: "19s", drift: "8px", size: "18px" },
];

export function FloatingHeartsBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-rose-300/25 blur-3xl" />
      <div className="absolute -right-16 top-1/3 h-80 w-80 rounded-full bg-fuchsia-300/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-64 w-96 rounded-full bg-pink-200/30 blur-3xl" />

      {HEARTS.map((h, i) => (
        <span
          key={i}
          className="qiubi-heart absolute bottom-[-6%] text-rose-400"
          style={
            {
              left: h.left,
              fontSize: h.size,
              ["--heart-drift" as string]: h.drift,
              ["--heart-dur" as string]: h.duration,
              ["--heart-delay" as string]: h.delay,
            } as CSSProperties
          }
        >
          ♥
        </span>
      ))}
    </div>
  );
}
