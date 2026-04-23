import { spawnSync } from "node:child_process";

// 仅在 Vercel 构建环境里自动做一次数据库同步（因为本项目没有 prisma/migrations）。
// 这样可以避免线上数据库缺表导致 Town 发布失败。
const isVercel =
  process.env.VERCEL === "1" ||
  process.env.VERCEL === "true" ||
  !!process.env.VERCEL_URL ||
  !!process.env.VERCEL_ENV;

const shouldForce = process.env.FORCE_DB_PUSH === "1" || process.env.FORCE_DB_PUSH === "true";
const shouldRun = shouldForce || isVercel;

if (!shouldRun) {
  console.log("[prebuild-dbpush] skip: not vercel build (set FORCE_DB_PUSH=1 to override)");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.log("[prebuild-dbpush] skip: DATABASE_URL not set");
  process.exit(0);
}

console.log("[prebuild-dbpush] running: prisma db push");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const res = spawnSync(npmCmd, ["run", "db:push"], {
  stdio: "inherit",
  env: process.env,
});

process.exit(res.status ?? 1);

