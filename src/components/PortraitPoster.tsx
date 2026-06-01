"use client";

import { useEffect, useState, useRef } from "react";

type PosterProps = {
  onClose: () => void;
};

export function PortraitPoster({ onClose }: PosterProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load poster HTML into iframe
    fetch("/api/user/portrait-poster", { credentials: "include" })
      .then((r) => r.text())
      .then((html) => {
        if (iframeRef.current) {
          const doc = iframeRef.current.contentDocument;
          if (doc) {
            doc.open();
            doc.write(html);
            doc.close();
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/invite`;
      await navigator.clipboard.writeText(url);
      alert("链接已复制！");
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "丘比 — AI帮你找对象",
          text: "来看看我的AI画像！用丘比找到你的灵魂伴侣 ✨",
          url: `${window.location.origin}/invite`,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-[420px]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--card)] text-lg font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:scale-110"
        >
          ✕
        </button>

        {/* Poster preview */}
        <div className="overflow-hidden rounded-2xl border-4 border-[var(--ink)] shadow-[8px_8px_0_var(--ink)]">
          {loading ? (
            <div className="flex h-[680px] items-center justify-center bg-[var(--ink)]">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--paper)] border-t-[var(--brand)]" />
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              title="AI Portrait Poster"
              className="h-[680px] w-full border-0"
              style={{ width: "390px", maxWidth: "100%" }}
            />
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--brand)] px-4 py-3 text-sm font-black text-[var(--ink)] shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>📤</span>
            <span>分享给朋友</span>
          </button>
          <button
            onClick={handleCopyLink}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--card)] px-4 py-3 text-sm font-black text-[var(--ink)] shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>🔗</span>
            <span>复制链接</span>
          </button>
        </div>
      </div>
    </div>
  );
}
