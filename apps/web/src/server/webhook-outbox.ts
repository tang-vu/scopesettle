import "server-only";

import { randomUUID } from "node:crypto";

import {
  and,
  arrayContains,
  asc,
  eq,
  inArray,
  isNull,
  lt,
  lte,
  or,
} from "drizzle-orm";

import { decryptWebhookSecret } from "./webhook-crypto";
import { deliverWebhook } from "./webhook-delivery";
import { getDatabase } from "./db";
import {
  webhookDeliveries,
  webhookEndpoints,
  webhookEvents,
  type WebhookEventType,
} from "./db/schema";

const MAX_ATTEMPTS = 8;
const RETRY_SECONDS = [60, 300, 1_800, 7_200, 43_200, 86_400, 86_400];

export function webhookEventValues(input: {
  eventType: Exclude<WebhookEventType, "endpoint.test">;
  chainId: number;
  jobId: bigint;
  deduplicationKey: string;
  payload: Record<string, unknown>;
}) {
  return { id: randomUUID(), ...input };
}

async function expandEvents(limit: number): Promise<number> {
  const database = getDatabase();
  const events = await database
    .select()
    .from(webhookEvents)
    .where(isNull(webhookEvents.processedAt))
    .orderBy(asc(webhookEvents.createdAt))
    .limit(limit);
  for (const event of events) {
    await database.transaction(async (transaction) => {
      const endpoints = await transaction
        .select({ id: webhookEndpoints.id })
        .from(webhookEndpoints)
        .where(
          and(
            eq(webhookEndpoints.active, true),
            eq(webhookEndpoints.chainId, event.chainId),
            eq(webhookEndpoints.jobId, event.jobId),
            arrayContains(webhookEndpoints.eventTypes, [event.eventType]),
          ),
        );
      if (endpoints.length > 0) {
        await transaction
          .insert(webhookDeliveries)
          .values(
            endpoints.map((endpoint) => ({
              id: randomUUID(),
              endpointId: endpoint.id,
              eventId: event.id,
              status: "pending" as const,
            })),
          )
          .onConflictDoNothing();
      }
      await transaction
        .update(webhookEvents)
        .set({ processedAt: new Date() })
        .where(
          and(
            eq(webhookEvents.id, event.id),
            isNull(webhookEvents.processedAt),
          ),
        );
    });
  }
  return events.length;
}

async function claimDeliveries(limit: number) {
  const database = getDatabase();
  const now = new Date();
  const candidates = await database
    .select({ id: webhookDeliveries.id })
    .from(webhookDeliveries)
    .innerJoin(
      webhookEndpoints,
      eq(webhookEndpoints.id, webhookDeliveries.endpointId),
    )
    .where(
      and(
        eq(webhookEndpoints.active, true),
        inArray(webhookDeliveries.status, ["pending", "retry", "processing"]),
        lte(webhookDeliveries.nextAttemptAt, now),
        or(
          isNull(webhookDeliveries.leaseUntil),
          lt(webhookDeliveries.leaseUntil, now),
        ),
      ),
    )
    .orderBy(asc(webhookDeliveries.nextAttemptAt))
    .limit(limit);
  const claimed: string[] = [];
  for (const candidate of candidates) {
    const rows = await database
      .update(webhookDeliveries)
      .set({
        status: "processing",
        leaseUntil: new Date(now.getTime() + 30_000),
        updatedAt: now,
      })
      .where(
        and(
          eq(webhookDeliveries.id, candidate.id),
          inArray(webhookDeliveries.status, ["pending", "retry", "processing"]),
          or(
            isNull(webhookDeliveries.leaseUntil),
            lt(webhookDeliveries.leaseUntil, now),
          ),
        ),
      )
      .returning({ id: webhookDeliveries.id });
    if (rows[0]) claimed.push(rows[0].id);
  }
  if (claimed.length === 0) return [];
  return database
    .select({
      id: webhookDeliveries.id,
      attemptCount: webhookDeliveries.attemptCount,
      url: webhookEndpoints.url,
      secretCiphertext: webhookEndpoints.secretCiphertext,
      secretIv: webhookEndpoints.secretIv,
      secretTag: webhookEndpoints.secretTag,
      eventId: webhookEvents.id,
      eventType: webhookEvents.eventType,
      payload: webhookEvents.payload,
      eventCreatedAt: webhookEvents.createdAt,
    })
    .from(webhookDeliveries)
    .innerJoin(
      webhookEndpoints,
      eq(webhookEndpoints.id, webhookDeliveries.endpointId),
    )
    .innerJoin(webhookEvents, eq(webhookEvents.id, webhookDeliveries.eventId))
    .where(
      and(
        inArray(webhookDeliveries.id, claimed),
        eq(webhookEndpoints.active, true),
      ),
    );
}

function safeDeliveryError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Unknown delivery failure.";
  return message.replace(/https?:\/\/\S+/gu, "[redacted-url]").slice(0, 500);
}

export async function processWebhookOutbox(limit = 10) {
  const expanded = await expandEvents(limit);
  const deliveries = await claimDeliveries(limit);
  let delivered = 0;
  let retried = 0;
  let dead = 0;
  for (const delivery of deliveries) {
    const attemptCount = delivery.attemptCount + 1;
    try {
      const secret = decryptWebhookSecret({
        ciphertext: delivery.secretCiphertext,
        iv: delivery.secretIv,
        tag: delivery.secretTag,
      });
      const response = await deliverWebhook({
        deliveryId: delivery.id,
        secret,
        url: delivery.url,
        envelope: {
          id: delivery.eventId,
          type: delivery.eventType,
          createdAt: delivery.eventCreatedAt.toISOString(),
          data: delivery.payload,
        },
      });
      await getDatabase()
        .update(webhookDeliveries)
        .set({
          status: "delivered",
          attemptCount,
          deliveredAt: new Date(),
          responseStatus: response.status,
          lastError: null,
          leaseUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, delivery.id));
      delivered += 1;
    } catch (error) {
      const isDead = attemptCount >= MAX_ATTEMPTS;
      const delaySeconds =
        RETRY_SECONDS[Math.min(attemptCount - 1, RETRY_SECONDS.length - 1)] ??
        86_400;
      const jitter = Math.floor(
        Math.random() * Math.max(1, delaySeconds * 0.2),
      );
      await getDatabase()
        .update(webhookDeliveries)
        .set({
          status: isDead ? "dead" : "retry",
          attemptCount,
          nextAttemptAt: new Date(Date.now() + (delaySeconds + jitter) * 1_000),
          lastError: safeDeliveryError(error),
          leaseUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, delivery.id));
      if (isDead) dead += 1;
      else retried += 1;
    }
  }
  return { expanded, claimed: deliveries.length, delivered, retried, dead };
}
