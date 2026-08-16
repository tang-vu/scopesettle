import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireWalletSession, UnauthorizedError } from "@/server/auth";
import { getDatabase } from "@/server/db";
import { auditEvents, webhookEndpoints } from "@/server/db/schema";
import { assertOrganizationOwner } from "@/server/developer-platform";
import { apiError } from "@/server/http";
import {
  parseWebhookUrl,
  resolvePublicWebhookTarget,
} from "@/server/webhook-security";

import { webhookSubscriptionEvents } from "../route";

type RouteContext = { params: Promise<{ endpointId: string }> };
const updateSchema = z
  .object({
    active: z.boolean().optional(),
    name: z.string().trim().min(2).max(80).optional(),
    url: z.url().max(2_000).optional(),
    eventTypes: z
      .array(z.enum(webhookSubscriptionEvents))
      .min(1)
      .max(webhookSubscriptionEvents.length)
      .optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "No changes were supplied.",
  );

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireWalletSession(request);
    const endpointId = z
      .string()
      .uuid()
      .parse((await context.params).endpointId);
    const body = updateSchema.parse(await request.json());
    const [endpoint] = await getDatabase()
      .select({ organizationId: webhookEndpoints.organizationId })
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, endpointId))
      .limit(1);
    if (!endpoint)
      throw new UnauthorizedError("Webhook endpoint access is denied.");
    await assertOrganizationOwner(session, endpoint.organizationId);
    const url = body.url ? parseWebhookUrl(body.url) : null;
    if (url) await resolvePublicWebhookTarget(url);
    const eventTypes = body.eventTypes
      ? [...new Set(body.eventTypes)].sort()
      : undefined;
    await getDatabase().transaction(async (transaction) => {
      const updated = await transaction
        .update(webhookEndpoints)
        .set({
          active: body.active,
          name: body.name,
          url: url?.href,
          eventTypes,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(webhookEndpoints.id, endpointId),
            eq(webhookEndpoints.organizationId, endpoint.organizationId),
          ),
        )
        .returning({ id: webhookEndpoints.id });
      if (updated.length !== 1) {
        throw new UnauthorizedError("Webhook endpoint access is denied.");
      }
      await transaction.insert(auditEvents).values({
        id: randomUUID(),
        organizationId: endpoint.organizationId,
        actorType: "wallet",
        actorId: session.address.toLowerCase(),
        action: "webhook.updated",
        targetType: "webhook_endpoint",
        targetId: endpointId,
        metadata: {
          changedFields: Object.keys(body).sort(),
          host: url?.hostname,
        },
      });
    });
    return NextResponse.json({ status: "updated" });
  } catch (error) {
    return apiError(error);
  }
}
