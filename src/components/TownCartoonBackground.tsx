"use client";

export function TownCartoonBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-amber-100/60 via-pink-50/35 to-sky-50/25" />
      <div className="absolute -top-24 left-10 h-64 w-64 rounded-full bg-amber-200/25 blur-2xl" />
      <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-sky-200/25 blur-3xl" />

      {/* 远处天际线（简化卡通风） */}
      <svg
        className="absolute bottom-0 left-0 h-[240px] w-full"
        viewBox="0 0 1200 260"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="townSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(15, 23, 42, 0.02)" />
            <stop offset="100%" stopColor="rgba(15, 23, 42, 0.18)" />
          </linearGradient>
          <linearGradient id="roof" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <rect x="0" y="120" width="1200" height="140" fill="url(#townSky)" />

        {/* building blocks */}
        {[
          { x: 60, w: 90, h: 90 },
          { x: 170, w: 120, h: 120 },
          { x: 310, w: 80, h: 80 },
          { x: 410, w: 140, h: 130 },
          { x: 580, w: 90, h: 100 },
          { x: 690, w: 150, h: 140 },
          { x: 860, w: 110, h: 110 },
          { x: 990, w: 130, h: 125 },
        ].map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={260 - b.h} width={b.w} height={b.h} rx="18" fill="rgba(17, 24, 39, 0.08)" />
            <path
              d={`M${b.x + 6} ${260 - b.h} L${b.x + b.w / 2} ${260 - b.h - 26} L${b.x + b.w - 6} ${
                260 - b.h
              } Z`}
              fill="url(#roof)"
            />
            {/* windows */}
            {[0, 1, 2].map((k) => (
              <rect
                key={k}
                x={b.x + 18 + k * 22}
                y={260 - b.h + 28}
                width="14"
                height="16"
                rx="4"
                fill="rgba(250, 204, 21, 0.22)"
              />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

