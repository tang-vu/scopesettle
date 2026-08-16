import { and, desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireWalletSession } from "@/server/auth";
import { getDatabase } from "@/server/db";
import {
  webhookDeliveries,
  webhookEndpoints,
  webhookEvents,
} from "@/server/db/schema";
import { assertOrganizationOwner } from "@/server/developer-platform";
import { apiError } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    const session = await requireWalletSession(request);
    const organizationId = z
      .string()
      .uuid()
      .parse(request.nextUrl.searchParams.get("organizationId"));
    const endpointValue = request.nextUrl.searchParams.get("endpointId");
    const endpointId = endpointValue
      ? z.string().uuid().parse(endpointValue)
      : null;
    await assertOrganizationOwner(session, organizationId);
    const deliveries = await getDatabase()
      .select({
        id: webhookDeliveries.id,
        endpointId: webhookDeliveries.endpointId,
        endpointName: webhookEndpoints.name,
        eventId: webhookDeliveries.eventId,
        eventType: webhookEvents.eventType,
        status: webhookDeliveries.status,
        attemptCount: webhookDeliveries.attemptCount,
        nextAttemptAt: webhookDeliveries.nextAttemptAt,
        responseStatus: webhookDeliveries.responseStatus,
        lastError: webhookDeliveries.lastError,
        deliveredAt: webhookDeliveries.deliveredAt,
        createdAt: webhookDeliveries.createdAt,
      })
      .from(webhookDeliveries)
      .innerJoin(
        webhookEndpoints,
        eq(webhookEndpoints.id, webhookDeliveries.endpointId),
      )
      .innerJoin(webhookEvents, eq(webhookEvents.id, webhookDeliveries.eventId))
      .where(
        endpointId
          ? and(
              eq(webhookEndpoints.organizationId, organizationId),
              eq(webhookEndpoints.id, endpointId),
            )
          : eq(webhookEndpoints.organizationId, organizationId),
      )
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(100);
    return NextResponse.json({ deliveries });
  } catch (error) {
    return apiError(error);
  }
}
