import type { Metadata } from "next";
import "./globals.css";
import { OnboardingRedirect } from "@/components/OnboardingRedirect";
import { NightModeProvider, NightDecorations } from "@/components/NightMode";

export const metadata: Metadata = {
  title: "丘比 - 心动社交",
  description: "由 Agent 助你发现心动伴侣与灵魂朋友",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen">
        <NightModeProvider>
          <NightDecorations />
          <OnboardingRedirect />
          {children}
        </NightModeProvider>
      </body>
    </html>
  );
}
