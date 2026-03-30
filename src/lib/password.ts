import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, encoded: string): boolean {
  const [salt, storedHash] = encoded.split(":");
  if (!salt || !storedHash) return false;
  const hashBuffer = scryptSync(plain, salt, 64);
  const storedBuffer = Buffer.from(storedHash, "hex");
  if (storedBuffer.length !== hashBuffer.length) return false;
  return timingSafeEqual(storedBuffer, hashBuffer);
}

