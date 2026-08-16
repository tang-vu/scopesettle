import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

import { UnauthorizedError } from "./auth";

export function requireCronSecret(request: NextRequest): void {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers
    .get("authorization")
    ?.match(/^Bearer (\S+)$/u)?.[1];
  if (!expected || expected.length < 32) {
    throw new Error("CRON_SECRET must contain at least 32 characters");
  }
  if (!supplied)
    throw new UnauthorizedError("Internal worker authorization is required.");
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  if (!timingSafeEqual(expectedHash, suppliedHash)) {
    throw new UnauthorizedError("Internal worker authorization is invalid.");
  }
}
