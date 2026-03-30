import { NextRequest, NextResponse } from "next/server";
import {
  getOauthStateCookie,
  clearOauthStateCookie,
  setSessionCookie,
  getCurrentUser,
} from "@/lib/auth";
import { prisma } from "@/lib/db";

const TOKEN_ENDPOINT = process.env.SECONDME_TOKEN_ENDPOINT;
const CLIENT_ID = process.env.SECONDME_CLIENT_ID;
const CLIENT_SECRET = process.env.SECONDME_CLIENT_SECRET;
const REDIRECT_URI = process.env.SECONDME_REDIRECT_URI ?? "http://localhost:3000/api/auth/callback";
const BASE_URL = process.env.SECONDME_API_BASE_URL;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    clearOauthStateCookie();
    return NextResponse.redirect(new URL(`/?error=${errorParam}`, request.url));
  }

  if (!code || !TOKEN_ENDPOINT || !CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/?error=missing_params", request.url));
  }

  const savedState = getOauthStateCookie();
  if (savedState && state !== savedState) {
    console.warn("OAuth state 验证失败，可能是跨 WebView 场景");
  }
  clearOauthStateCookie();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.code !== 0 || !tokenData.data?.accessToken) {
    console.error("Token 交换失败", tokenData);
    return NextResponse.redirect(new URL("/?error=token_failed", request.url));
  }

  const { accessToken, refreshToken, expiresIn } = tokenData.data;
  const tokenExpiresAt = new Date(Date.now() + (expiresIn ?? 7200) * 1000);

  let userId: string;
  const userInfoRes = await fetch(`${BASE_URL}/api/secondme/user/info`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const userInfoData = await userInfoRes.json();
  const info = userInfoData.data ?? {};
  if (userInfoData.code === 0 && info.userId) {
    userId = info.userId;
  } else {
    userId = `unknown-${Date.now()}`;
  }

  const sessionUser = await getCurrentUser();
  let user;
  if (sessionUser?.id) {
    user = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        secondmeUserId: userId,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        authProvider: sessionUser.authProvider === "local" ? "local+secondme" : "secondme",
        name: info.name ?? sessionUser.name ?? null,
        avatarUrl: info.avatar ?? sessionUser.avatarUrl ?? null,
        bio: info.bio ?? null,
      },
    });
  } else {
    user = await prisma.user.upsert({
      where: { secondmeUserId: userId },
      create: {
        secondmeUserId: userId,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        authProvider: "secondme",
        name: info.name ?? null,
        avatarUrl: info.avatar ?? null,
        bio: info.bio ?? null,
        onboardingDone: false,
      },
      update: {
        accessToken,
        refreshToken,
        tokenExpiresAt,
        authProvider: "secondme",
        name: info.name ?? null,
        avatarUrl: info.avatar ?? null,
        bio: info.bio ?? null,
      },
    });
  }

  setSessionCookie(user.id);
  return NextResponse.redirect(new URL("/", request.url));
}
