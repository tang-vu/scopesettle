import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireWalletSession, UnauthorizedError } from "@/server/auth";
import { getDatabase } from "@/server/db";
import {
  auditEvents,
  webhookDeliveries,
  webhookEndpoints,
} from "@/server/db/schema";
import { assertOrganizationOwner } from "@/server/developer-platform";
import { apiError } from "@/server/http";
import { scheduleWebhookProcessing } from "@/server/webhook-scheduler";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ deliveryId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireWalletSession(request);
    const deliveryId = z
      .string()
      .uuid()
      .parse((await context.params).deliveryId);
    const [delivery] = await getDatabase()
      .select({ organizationId: webhookEndpoints.organizationId })
      .from(webhookDeliveries)
      .innerJoin(
        webhookEndpoints,
        eq(webhookEndpoints.id, webhookDeliveries.endpointId),
      )
      .where(eq(webhookDeliveries.id, deliveryId))
      .limit(1);
    if (!delivery)
      throw new UnauthorizedError("Webhook delivery access is denied.");
    await assertOrganizationOwner(session, delivery.organizationId);
    await getDatabase().transaction(async (transaction) => {
      const updated = await transaction
        .update(webhookDeliveries)
        .set({
          status: "retry",
          attemptCount: 0,
          nextAttemptAt: new Date(),
          leaseUntil: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(webhookDeliveries.id, deliveryId),
            inArray(webhookDeliveries.status, ["retry", "dead"]),
          ),
        )
        .returning({ id: webhookDeliveries.id });
      if (updated.length !== 1) {
        const conflict = new Error("Only failed deliveries can be retried.");
        conflict.name = "ConflictError";
        throw conflict;
      }
      await transaction.insert(auditEvents).values({
        id: randomUUID(),
        organizationId: delivery.organizationId,
        actorType: "wallet",
        actorId: session.address.toLowerCase(),
        action: "webhook.delivery_retried",
        targetType: "webhook_delivery",
        targetId: deliveryId,
        metadata: {},
      });
    });
    scheduleWebhookProcessing();
    return NextResponse.json({ deliveryId, status: "retry" }, { status: 202 });
  } catch (error) {
    return apiError(error);
  }
}
