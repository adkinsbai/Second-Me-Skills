"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type NightModeContextValue = {
  isNight: boolean;       // after 23:00
  isLateNight: boolean;   // after 01:00
  hour: number;
};

const NightModeContext = createContext<NightModeContextValue>({
  isNight: false,
  isLateNight: false,
  hour: 12,
});

export function useNightMode() {
  return useContext(NightModeContext);
}

export function NightModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NightModeContextValue>({
    isNight: false,
    isLateNight: false,
    hour: 12,
  });

  useEffect(() => {
    function check() {
      const h = new Date().getHours();
      const isNight = h >= 23 || h < 5;
      const isLateNight = h >= 1 || (h >= 0 && h < 5);
      setState({ isNight, isLateNight, hour: h });

      // Apply / remove night-mode class on <html>
      if (isNight) {
        document.documentElement.classList.add("night-mode");
      } else {
        document.documentElement.classList.remove("night-mode");
      }
    }

    check();
    const id = setInterval(check, 60_000); // re-check every minute
    return () => clearInterval(id);
  }, []);

  return (
    <NightModeContext.Provider value={state}>
      {children}
    </NightModeContext.Provider>
  );
}

/** Decorative moon + stars overlay for night mode */
export function NightDecorations() {
  const { isNight } = useNightMode();
  if (!isNight) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[999] overflow-hidden opacity-30" aria-hidden>
      {/* Moon */}
      <div
        className="absolute right-6 top-16 text-5xl"
        style={{ filter: "drop-shadow(0 0 12px rgba(255,230,150,0.5))" }}
      >
        🌙
      </div>
      {/* Scattered stars */}
      {["12%", "35%", "58%", "78%", "88%"].map((left, i) => (
        <span
          key={i}
          className="absolute text-xs"
          style={{
            left,
            top: `${8 + i * 18}%`,
            animation: `twinkle ${2 + i * 0.5}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.7}s`,
          }}
        >
          ✨
        </span>
      ))}
      <style>{`
        @keyframes twinkle {
          0% { opacity: 0.3; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
