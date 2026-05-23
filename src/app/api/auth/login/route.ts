import { NextResponse } from "next/server";
import { generateState, setOauthStateCookie } from "@/lib/auth";

const OAUTH_URL = process.env.SECONDME_OAUTH_URL ?? "https://go.second.me/oauth/";
const CLIENT_ID = process.env.SECONDME_CLIENT_ID;
const REDIRECT_URI = process.env.SECONDME_REDIRECT_URI ?? "http://localhost:3000/api/auth/callback";
const SCOPES = "user.info user.info.shades user.info.softmemory chat note.add";

export async function GET() {
  if (!CLIENT_ID) {
    return NextResponse.json(
      { error: "未配置 SECONDME_CLIENT_ID" },
      { status: 500 }
    );
  }
  const state = generateState();
  setOauthStateCookie(state);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    state,
    scope: SCOPES,
  });
  const url = `${OAUTH_URL}?${params.toString()}`;
  return NextResponse.redirect(url);
}
