"use client";

import { MatchNetworkGlobe } from "@/components/MatchNetworkGlobe";
import { MatchExploration } from "@/components/MatchExploration";
import { useState } from "react";

export default function MatchStartPage() {
  const [showExploration, setShowExploration] = useState(false);

  return (
    <>
      {showExploration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-[400px] rounded-3xl border-2 border-[var(--ink)] bg-[var(--card)] p-6 shadow-[8px_8px_0_var(--ink)]">
            <MatchExploration onComplete={() => setShowExploration(false)} />
          </div>
        </div>
      )}
      <MatchNetworkGlobe backHref="/settings/heartbeat" title="开始匹配" />
    </>
  );
}
