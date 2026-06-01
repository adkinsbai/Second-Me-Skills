import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "qiubi_session";
/** Backward compat: read old cookie if new one is absent */
const LEGACY_SESSION_COOKIE = "secondme_session";
const OAUTH_STATE_COOKIE = "secondme_oauth_state";
const REFRESH_ENDPOINT = process.env.SECONDME_REFRESH_ENDPOINT;
const CLIENT_ID = process.env.SECONDME_CLIENT_ID;
const CLIENT_SECRET = process.env.SECONDME_CLIENT_SECRET;

export function getSessionCookie(): string | undefined {
  return cookies().get(SESSION_COOKIE)?.value ?? cookies().get(LEGACY_SESSION_COOKIE)?.value;
}

export function setSessionCookie(value: string) {
  cookies().set(SESSION_COOKIE, value, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  // Clear legacy cookie if present
  try { cookies().delete(LEGACY_SESSION_COOKIE); } catch {}
}
export function setSessionCookieWithOptions(value: string, options?: { remember?: boolean }) {
  const remember = options?.remember ?? true;
  cookies().set(SESSION_COOKIE, value, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
  // Clear legacy cookie if present
  try { cookies().delete(LEGACY_SESSION_COOKIE); } catch {}
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
  try { cookies().delete(LEGACY_SESSION_COOKIE); } catch {}
}

export function setOauthStateCookie(value: string) {
  cookies().set(OAUTH_STATE_COOKIE, value, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
  });
}

export function getOauthStateCookie(): string | undefined {
  return cookies().get(OAUTH_STATE_COOKIE)?.value;
}

export function clearOauthStateCookie() {
  cookies().delete(OAUTH_STATE_COOKIE);
}

export function generateState(): string {
  const array = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getCurrentUser(): Promise<{
  id: string;
  secondmeUserId: string | null;
  accessToken: string | null;
  name: string | null;
  avatarUrl: string | null;
  email: string | null;
  authProvider: string;
} | null> {
  const sessionId = getSessionCookie();
  if (!sessionId) return null;
  const user = await prisma.user.findUnique({ where: { id: sessionId } });
  if (!user) return null;
  return {
    id: user.id,
    secondmeUserId: user.secondmeUserId ?? null,
    accessToken: user.accessToken ?? null,
    name: user.name,
    avatarUrl: user.avatarUrl,
    email: user.email ?? null,
    authProvider: user.authProvider,
  };
}

export async function getCurrentUserWithToken(): Promise<{
  id: string;
  secondmeUserId: string;
  accessToken: string;
  name: string | null;
  avatarUrl: string | null;
} | null> {
  const sessionId = getSessionCookie();
  if (!sessionId) return null;
  const dbUser = await prisma.user.findUnique({ where: { id: sessionId } });
  if (!dbUser?.accessToken || !dbUser.secondmeUserId) return null;

  const tokenResult = await refreshAndReturnToken(dbUser);
  if (!tokenResult) return null;

  return {
    id: dbUser.id,
    secondmeUserId: dbUser.secondmeUserId!,
    accessToken: tokenResult.accessToken,
    name: dbUser.name,
    avatarUrl: dbUser.avatarUrl,
  };
}

/**
 * 用于服务端队列/后台任务：按 userId 取 Second Me token（必要时自动 refresh）。
 * 不依赖浏览器 cookies（避免浏览器关闭导致任务中断）。
 */
export async function getUserWithTokenById(userId: string): Promise<{
  id: string;
  secondmeUserId: string;
  accessToken: string;
  name: string | null;
  avatarUrl: string | null;
} | null> {
  if (!userId) return null;
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser?.accessToken || !dbUser.secondmeUserId) return null;

  const tokenResult = await refreshAndReturnToken(dbUser);
  if (!tokenResult) return null;

  return {
    id: dbUser.id,
    secondmeUserId: dbUser.secondmeUserId!,
    accessToken: tokenResult.accessToken,
    name: dbUser.name,
    avatarUrl: dbUser.avatarUrl,
  };
}

async function refreshAndReturnToken(dbUser: {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}): Promise<{ accessToken: string; userId: string } | null> {
  if (!dbUser.accessToken) return null;
  let accessToken = dbUser.accessToken;
  if (
    dbUser.tokenExpiresAt &&
    new Date() >= dbUser.tokenExpiresAt &&
    dbUser.refreshToken &&
    REFRESH_ENDPOINT &&
    CLIENT_ID &&
    CLIENT_SECRET
  ) {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: dbUser.refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });
    const res = await fetch(REFRESH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = await res.json().catch(() => null);
    if (data && data.code === 0 && data.data?.accessToken) {
      accessToken = data.data.accessToken;
      const expiresAt = new Date(Date.now() + (data.data.expiresIn ?? 7200) * 1000);
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken ?? dbUser.refreshToken,
          tokenExpiresAt: expiresAt,
        },
      });
    }
  }
  return { accessToken, userId: dbUser.id };
}
