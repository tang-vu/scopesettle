import { createHash, createHmac, randomBytes } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getAddress } from "viem";

import { supportedChains } from "@scopesettle/shared";

import { getDatabase } from "./db";
import { authNonces, authSessions } from "./db/schema";

export const SESSION_COOKIE = "scopesettle_session";
const NONCE_TTL_MS = 5 * 60 * 1_000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1_000;

export class UnauthorizedError extends Error {
  constructor(message = "Wallet authentication is required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  return value;
}

function digest(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function expectedOrigin(request: NextRequest): URL {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  return new URL(configured || request.nextUrl.origin);
}

export function assertSupportedChain(chainId: number): void {
  if (!supportedChains.some((chain) => chain.id === chainId)) {
    throw new UnauthorizedError("The signed chain is not supported.");
  }
}

export async function issueNonce(
  addressInput: string,
  chainId: number,
  domain: string,
): Promise<{ nonce: string; expiresAt: string }> {
  assertSupportedChain(chainId);
  const address = getAddress(addressInput).toLowerCase();
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);
  await getDatabase()
    .insert(authNonces)
    .values({
      address,
      chainId,
      domain,
      expiresAt,
      nonceHash: digest(nonce),
    });
  return { nonce, expiresAt: expiresAt.toISOString() };
}

export async function consumeNonce(input: {
  address: string;
  chainId: number;
  domain: string;
  nonce: string;
}): Promise<void> {
  const address = getAddress(input.address).toLowerCase();
  const now = new Date();
  const rows = await getDatabase()
    .update(authNonces)
    .set({ usedAt: now })
    .where(
      and(
        eq(authNonces.nonceHash, digest(input.nonce)),
        eq(authNonces.address, address),
        eq(authNonces.chainId, input.chainId),
        eq(authNonces.domain, input.domain),
        isNull(authNonces.usedAt),
        gt(authNonces.expiresAt, now),
      ),
    )
    .returning({ nonceHash: authNonces.nonceHash });
  if (rows.length !== 1)
    throw new UnauthorizedError("The sign-in nonce is invalid or expired.");
}

export async function createSession(
  addressInput: string,
  chainId: number,
): Promise<{ token: string; expiresAt: Date }> {
  const address = getAddress(addressInput).toLowerCase();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await getDatabase()
    .insert(authSessions)
    .values({
      tokenHash: digest(token),
      address,
      chainId,
      expiresAt,
    });
  return { token, expiresAt };
}

export type WalletSession = { address: `0x${string}`; chainId: number };

export async function requireWalletSession(
  request: NextRequest,
): Promise<WalletSession> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) throw new UnauthorizedError();
  const [session] = await getDatabase()
    .select({
      address: authSessions.address,
      chainId: authSessions.chainId,
    })
    .from(authSessions)
    .where(
      and(
        eq(authSessions.tokenHash, digest(token)),
        gt(authSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!session) throw new UnauthorizedError("The wallet session has expired.");
  return { address: getAddress(session.address), chainId: session.chainId };
}

export function publicRequestFingerprint(request: NextRequest): string {
  const forwarded =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(forwarded).digest("hex").slice(0, 16);
}
