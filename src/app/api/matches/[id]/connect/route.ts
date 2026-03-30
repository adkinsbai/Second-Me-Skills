import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const { id } = await params;

  const match = await prisma.match.findFirst({
    where: { id, userId: user.id },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });

  if (match.status === "connected") {
    return NextResponse.json({ code: 0, data: { status: "connected" } });
  }

  await prisma.match.update({
    where: { id: match.id },
    data: { status: "connected" },
  });

  return NextResponse.json({ code: 0, data: { status: "connected" } });
}

