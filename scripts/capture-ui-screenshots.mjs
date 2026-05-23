/**
 * 在本地开发服务器已启动的前提下，截取各页面 PNG 到 public/ui-screenshots/
 * 用法: npm run dev:3456   （另开终端）
 *       node scripts/capture-ui-screenshots.mjs
 *
 * 依赖: npx playwright install chromium（首次需联网下载浏览器）
 *
 * 说明:
 * - /auth 必须在「未登录」时截取，否则会重定向到首页。
 * - 小镇 /town/* 与 /matches 等必须在「已登录」时截取，否则会重定向到 /auth。
 *   脚本先单独截 auth，再 POST /api/auth/guest 写入 Cookie 后截其余页。
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "ui-screenshots");

function resolveChromiumExecutable() {
  const env = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (env && fs.existsSync(env)) return env;
  const base = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "ms-playwright");
  if (!fs.existsSync(base)) return undefined;
  const dirs = fs.readdirSync(base).filter((d) => d.startsWith("chromium-"));
  for (const d of dirs) {
    const win = path.join(base, d, "chrome-win", "chrome.exe");
    if (fs.existsSync(win)) return win;
  }
  return undefined;
}

const BASE = process.env.CAPTURE_BASE_URL || "http://127.0.0.1:3456";

const VIEWPORT = { width: 390, height: 844 };
const DSF = 2;

async function ensureGuestSession(context) {
  const res = await context.request.post(`${BASE}/api/auth/guest`, {
    headers: { "Content-Type": "application/json" },
    data: {},
  });
  if (!res.ok()) {
    const t = await res.text().catch(() => "");
    const hint =
      res.status() === 500
        ? "（常见原因：DATABASE_URL 对应的数据库不可达，请先确认 Neon/本地 Postgres 在线）"
        : "";
    throw new Error(`访客登录失败 HTTP ${res.status()} ${hint}\n${t.slice(0, 500)}`);
  }
  console.log("Session: guest OK (secondme_session set)");
}

async function screenshotPage(context, file, p, waitMs) {
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}${p}`, { waitUntil: "networkidle", timeout: 60000 });
    await new Promise((r) => setTimeout(r, waitMs));
    await page.screenshot({ path: path.join(outDir, file), fullPage: false });
    console.log("OK", file);
  } catch (e) {
    console.error("FAIL", file, e.message);
  } finally {
    await page.close();
  }
}

/** 未登录时展示的登录页（若先 guest 再打开 /auth 会跳首页，必须单独截） */
const AUTH_PAGE = { file: "auth.png", path: "/auth", waitMs: 2800 };

/** 访客登录后的页面（与 FEATURES / PROJECT-SUMMARY 顺序一致） */
const PAGES_LOGGED_IN = [
  { file: "home.png", path: "/", waitMs: 3500 },
  { file: "privacy.png", path: "/privacy", waitMs: 2200 },
  { file: "intro-quiz.png", path: "/intro/quiz", waitMs: 2800 },
  { file: "onboarding.png", path: "/onboarding", waitMs: 2800 },
  { file: "match-start.png", path: "/match-start", waitMs: 3200 },
  { file: "heartbeat.png", path: "/settings/heartbeat", waitMs: 3500 },
  { file: "matches.png", path: "/matches", waitMs: 4500 },
  { file: "town.png", path: "/town", waitMs: 4500 },
  { file: "town-explore.png", path: "/town/explore", waitMs: 4500 },
  { file: "town-messages.png", path: "/town/messages", waitMs: 4500 },
  { file: "town-my-needs.png", path: "/town/my-needs", waitMs: 4500 },
];

fs.mkdirSync(outDir, { recursive: true });

const exe = resolveChromiumExecutable();
const browser = await chromium.launch({
  headless: true,
  ...(exe ? { executablePath: exe } : {}),
});

// 1) 仅截取 /auth（无 Cookie）
const ctxAuth = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DSF });
await screenshotPage(ctxAuth, AUTH_PAGE.file, AUTH_PAGE.path, AUTH_PAGE.waitMs);
await ctxAuth.close();

// 2) 访客会话后截取其余页面（含小镇）
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DSF });
await ensureGuestSession(context);
for (const { file, path: p, waitMs } of PAGES_LOGGED_IN) {
  await screenshotPage(context, file, p, waitMs);
}
await context.close();

await browser.close();
console.log("Done. Images in public/ui-screenshots/");
