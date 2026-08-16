import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireWalletSession, UnauthorizedError } from "@/server/auth";
import { getDatabase } from "@/server/db";
import {
  auditEvents,
  webhookDeliveries,
  webhookEndpoints,
  webhookEvents,
} from "@/server/db/schema";
import { assertOrganizationOwner } from "@/server/developer-platform";
import { apiError } from "@/server/http";
import { scheduleWebhookProcessing } from "@/server/webhook-scheduler";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ endpointId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireWalletSession(request);
    const endpointId = z
      .string()
      .uuid()
      .parse((await context.params).endpointId);
    const [endpoint] = await getDatabase()
      .select({
        organizationId: webhookEndpoints.organizationId,
        chainId: webhookEndpoints.chainId,
        jobId: webhookEndpoints.jobId,
        active: webhookEndpoints.active,
      })
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, endpointId))
      .limit(1);
    if (!endpoint)
      throw new UnauthorizedError("Webhook endpoint access is denied.");
    if (!endpoint.active) {
      return NextResponse.json(
        { error: "Activate the webhook endpoint before testing it." },
        { status: 409 },
      );
    }
    await assertOrganizationOwner(session, endpoint.organizationId);
    const eventId = randomUUID();
    const deliveryId = randomUUID();
    await getDatabase().transaction(async (transaction) => {
      await transaction.insert(webhookEvents).values({
        id: eventId,
        eventType: "endpoint.test",
        chainId: endpoint.chainId,
        jobId: endpoint.jobId,
        deduplicationKey: eventId,
        payload: {
          chainId: endpoint.chainId,
          jobId: endpoint.jobId.toString(),
          message: "ScopeSettle webhook connectivity test",
        },
        processedAt: new Date(),
      });
      await transaction.insert(webhookDeliveries).values({
        id: deliveryId,
        endpointId,
        eventId,
        status: "pending",
      });
      await transaction.insert(auditEvents).values({
        id: randomUUID(),
        organizationId: endpoint.organizationId,
        actorType: "wallet",
        actorId: session.address.toLowerCase(),
        action: "webhook.test_queued",
        targetType: "webhook_delivery",
        targetId: deliveryId,
        metadata: { endpointId },
      });
    });
    scheduleWebhookProcessing();
    return NextResponse.json(
      { deliveryId, eventId, status: "pending" },
      { status: 202 },
    );
  } catch (error) {
    return apiError(error);
  }
}
