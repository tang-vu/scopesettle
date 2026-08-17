import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_PATTERN = /^ss_live_([a-f0-9]{16})_([A-Za-z0-9_-]{43})$/u;

function apiKeyPepper(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  return value;
}

export function digestApiKey(value: string): string {
  return scryptSync(value, apiKeyPepper(), 32).toString("hex");
}

export function createApiKeySecret(): {
  token: string;
  prefix: string;
  secretHash: string;
} {
  const prefix = randomBytes(8).toString("hex");
  const secret = randomBytes(32).toString("base64url");
  const token = `ss_live_${prefix}_${secret}`;
  return { token, prefix, secretHash: digestApiKey(token) };
}

export function apiKeyPrefix(value: string): string | null {
  return KEY_PATTERN.exec(value)?.[1] ?? null;
}

export function apiKeyDigestMatches(value: string, expected: string): boolean {
  const actualBuffer = Buffer.from(digestApiKey(value), "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
