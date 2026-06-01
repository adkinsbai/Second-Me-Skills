/**
 * Cloudflare R2 (S3-compatible) image storage helper.
 *
 * Falls back to returning base64 data URLs when R2 env vars are not configured,
 * ensuring backward compatibility during development.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// ── Config ──────────────────────────────────────────────────────────────────

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "qiubi-images";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://images.qiubi.app

/** True when all required R2 credentials are present. */
export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL);
}

let _s3: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Upload an image buffer to R2 and return its public URL.
 *
 * If R2 is not configured the function returns `null` — callers should
 * fall back to keeping the base64 value.
 */
export async function uploadImage(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  if (!isR2Configured()) {
    throw new Error("R2_NOT_CONFIGURED");
  }

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Delete an image from R2 by its key.
 */
export async function deleteImage(key: string): Promise<void> {
  if (!isR2Configured()) return;

  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * Build the public URL for a given key (does not verify existence).
 */
export function getImageUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Derive the R2 object key from a full public URL.
 * Returns `null` if the URL does not belong to R2_PUBLIC_URL.
 */
export function keyFromUrl(url: string): string | null {
  if (!R2_PUBLIC_URL || !url.startsWith(R2_PUBLIC_URL + "/")) return null;
  return url.slice(R2_PUBLIC_URL.length + 1);
}

/**
 * Determine whether a string looks like a base64 data URL (as opposed to an
 * http(s) URL). Used by callers to decide upload vs. pass-through.
 */
export function isDataUrl(value: string): boolean {
  return value.startsWith("data:");
}

/**
 * Convert a base64 data URL to a Buffer + content-type pair.
 */
export function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  return { buffer, contentType };
}
