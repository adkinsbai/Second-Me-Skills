import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSessionCookieWithOptions } from "@/lib/auth";
import { hitRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = hitRateLimit(`guest:${ip}`, 20, 10 * 60 * 1000);
    if (rl.limited) {
      return NextResponse.json({ code: 429, message: "进入次数过于频繁，请稍后再试" }, { status: 429 });
    }

    const guestName = `游客${Math.floor(Math.random() * 9000 + 1000)}`;
    const user = await prisma.user.create({
      data: {
        name: guestName,
        authProvider: "guest",
        onboardingDone: true,
      },
    });

    setSessionCookieWithOptions(user.id, { remember: false });
    return NextResponse.json({ code: 0, data: { id: user.id, name: user.name, authProvider: user.authProvider } });
  } catch (e) {
    console.error("[auth/guest]", e);
    const message =
      process.env.NODE_ENV === "development"
        ? e instanceof Error
          ? e.message
          : String(e)
        : "服务器错误";
    return NextResponse.json({ code: 500, message }, { status: 500 });
  }
}
