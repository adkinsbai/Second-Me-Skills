import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { endpoint, p256dh, auth } = body as {
    endpoint?: string;
    p256dh?: string;
    auth?: string;
  };
  if (!endpoint) return NextResponse.json({ code: 400, message: 'endpoint required' }, { status: 400 });

  await prisma.pushSubscription.upsert({
    where: { userId_endpoint: { userId: user.id, endpoint } },
    create: { userId: user.id, endpoint, p256dh: p256dh || '', auth: auth || '' },
    update: { p256dh: p256dh || '', auth: auth || '' },
  });

  return NextResponse.json({ code: 0, message: 'ok' });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { endpoint } = body as { endpoint?: string };
  if (!endpoint) return NextResponse.json({ code: 400, message: 'endpoint required' }, { status: 400 });

  await prisma.pushSubscription.deleteMany({
    where: { userId: user.id, endpoint },
  });

  return NextResponse.json({ code: 0, message: 'ok' });
}
