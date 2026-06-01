import { prisma } from '@/lib/db';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:push@qiubi.app';

/**
 * Send a web push notification to a user.
 * Uses native fetch + VAPID JWT (no external dependency).
 */
export async function sendPush(
  userId: string,
  title: string,
  body: string,
  url?: string,
): Promise<number> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });
  if (subscriptions.length === 0) return 0;

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      const ok = await sendWebPush(sub.endpoint, {
        title,
        body,
        url: url || '/',
        tag: 'qiubi-chat',
      });
      if (ok) sent++;
    } catch {
      // Remove stale subscription
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: sub.endpoint },
      });
    }
  }
  return sent;
}

async function sendWebPush(
  endpoint: string,
  payload: Record<string, string>,
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;

  const jwt = await createVapidJwt(endpoint);
  const body = JSON.stringify(payload);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'vapid t=' + jwt + ', k=' + VAPID_PUBLIC_KEY,
      TTL: '86400',
    },
    body,
  });

  if (res.status === 410 || res.status === 404) {
    throw new Error('Subscription expired');
  }
  return res.ok;
}

async function createVapidJwt(endpoint: string): Promise<string> {
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const claims = btoa(JSON.stringify({ aud, exp, sub: VAPID_SUBJECT }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const unsignedToken = header + '.' + claims;

  const privateKeyDer = base64UrlToUint8Array(VAPID_PRIVATE_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyDer.buffer as ArrayBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const encoded = new TextEncoder().encode(unsignedToken);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoded,
  );
  const sigBytes = new Uint8Array(signature);
  let sigBinary = '';
  for (let i = 0; i < sigBytes.length; i++) {
    sigBinary += String.fromCharCode(sigBytes[i]);
  }
  const sigB64 = btoa(sigBinary)
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return unsignedToken + '.' + sigB64;
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}
