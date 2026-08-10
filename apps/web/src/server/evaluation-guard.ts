import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, lt, sql } from "drizzle-orm";

import { getDatabase } from "./db";
import { evaluationLeases, evaluationRateLimits } from "./db/schema";
import { RateLimitError } from "./http";

const LEASE_TTL_MS = 10 * 60 * 1_000;
const RATE_WINDOW_MS = 60 * 60 * 1_000;
const REQUESTS_PER_WINDOW = 3;

export type EvaluationLease = {
  chainId: number;
  jobId: bigint;
  holder: string;
};

export function evaluationRateWindow(now = Date.now()): {
  startedAt: Date;
  retryAfterSeconds: number;
} {
  const start = Math.floor(now / RATE_WINDOW_MS) * RATE_WINDOW_MS;
  return {
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((start + RATE_WINDOW_MS - now) / 1_000),
    ),
    startedAt: new Date(start),
  };
}

export async function acquireEvaluationLease(input: {
  address: `0x${string}`;
  chainId: number;
  jobId: bigint;
}): Promise<EvaluationLease> {
  const database = getDatabase();
  const now = new Date();
  const holder = randomUUID();
  const expiresAt = new Date(now.getTime() + LEASE_TTL_MS);
  const [lease] = await database
    .insert(evaluationLeases)
    .values({
      acquiredAt: now,
      chainId: input.chainId,
      expiresAt,
      holder,
      jobId: input.jobId,
    })
    .onConflictDoUpdate({
      set: { acquiredAt: now, expiresAt, holder },
      setWhere: lt(evaluationLeases.expiresAt, now),
      target: [evaluationLeases.chainId, evaluationLeases.jobId],
    })
    .returning({ holder: evaluationLeases.holder });
  if (!lease || lease.holder !== holder) {
    const conflict = new Error(
      "An evaluation is already running for this exact job.",
    );
    conflict.name = "ConflictError";
    throw conflict;
  }

  try {
    const window = evaluationRateWindow(now.getTime());
    const normalizedAddress = input.address.toLowerCase();
    const [rateSlot] = await database
      .insert(evaluationRateLimits)
      .values({
        address: normalizedAddress,
        chainId: input.chainId,
        requestCount: 1,
        windowStartedAt: window.startedAt,
      })
      .onConflictDoUpdate({
        set: {
          requestCount: sql`${evaluationRateLimits.requestCount} + 1`,
        },
        setWhere: lt(evaluationRateLimits.requestCount, REQUESTS_PER_WINDOW),
        target: [
          evaluationRateLimits.address,
          evaluationRateLimits.chainId,
          evaluationRateLimits.windowStartedAt,
        ],
      })
      .returning({ requestCount: evaluationRateLimits.requestCount });
    if (!rateSlot) {
      throw new RateLimitError(
        "This wallet has reached the evaluation limit. Retry after the current hourly window.",
        window.retryAfterSeconds,
      );
    }
  } catch (error) {
    await releaseEvaluationLease({
      chainId: input.chainId,
      holder,
      jobId: input.jobId,
    }).catch(() => undefined);
    throw error;
  }
  return { chainId: input.chainId, holder, jobId: input.jobId };
}

export async function releaseEvaluationLease(
  lease: EvaluationLease,
): Promise<void> {
  await getDatabase()
    .delete(evaluationLeases)
    .where(
      and(
        eq(evaluationLeases.chainId, lease.chainId),
        eq(evaluationLeases.jobId, lease.jobId),
        eq(evaluationLeases.holder, lease.holder),
      ),
    );
}
