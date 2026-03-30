"use client";

import { useId } from "react";

/** 首页同款炫彩「Q」字，作匹配页中心品牌（useId 避免 SSR hydration 不一致） */
export function QiubiCenterMark({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const gid = `qGrad_${uid}`;
  const fg = `qGlow_${uid}`;
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="丘比"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff2d55" />
          <stop offset="25%" stopColor="#ff9f0a" />
          <stop offset="50%" stopColor="#ffcc00" />
          <stop offset="75%" stopColor="#34c759" />
          <stop offset="100%" stopColor="#0a84ff" />
        </linearGradient>
        <filter id={fg} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <text
        x="100"
        y="138"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
        fontSize="124"
        fontWeight="900"
        fill={`url(#${gid})`}
        opacity="0.22"
        filter={`url(#${fg})`}
      >
        Q
      </text>
      <text
        x="100"
        y="138"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
        fontSize="124"
        fontWeight="900"
        fill={`url(#${gid})`}
      >
        Q
      </text>
    </svg>
  );
}
