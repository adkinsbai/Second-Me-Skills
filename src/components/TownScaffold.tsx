"use client";

import { TownCartoonBackground } from "@/components/TownCartoonBackground";

type Props = {
  children: React.ReactNode;
};

/**
 * 小镇浅色卡通底。注意：`town-on-light` 请只包「铺在浅色背景上的主内容」，
 * 深色弹窗不要放在 `town-on-light` 里，否则会误改弹窗内 `.luxury-subtitle` 颜色。
 */
export function TownScaffold({ children }: Props) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <TownCartoonBackground />
      <div className="relative z-10">{children}</div>
    </main>
  );
}
