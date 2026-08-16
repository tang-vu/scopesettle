import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireWalletSession, UnauthorizedError } from "@/server/auth";
import { getDatabase } from "@/server/db";
import { auditEvents, webhookEndpoints } from "@/server/db/schema";
import { assertOrganizationOwner } from "@/server/developer-platform";
import { apiError } from "@/server/http";
import {
  createWebhookSecret,
  encryptWebhookSecret,
} from "@/server/webhook-crypto";

type RouteContext = { params: Promise<{ endpointId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireWalletSession(request);
    const endpointId = z
      .string()
      .uuid()
      .parse((await context.params).endpointId);
    const [endpoint] = await getDatabase()
      .select({ organizationId: webhookEndpoints.organizationId })
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, endpointId))
      .limit(1);
    if (!endpoint)
      throw new UnauthorizedError("Webhook endpoint access is denied.");
    await assertOrganizationOwner(session, endpoint.organizationId);
    const secret = createWebhookSecret();
    const encrypted = encryptWebhookSecret(secret);
    await getDatabase().transaction(async (transaction) => {
      await transaction
        .update(webhookEndpoints)
        .set({
          secretCiphertext: encrypted.ciphertext,
          secretIv: encrypted.iv,
          secretTag: encrypted.tag,
          updatedAt: new Date(),
        })
        .where(eq(webhookEndpoints.id, endpointId));
      await transaction.insert(auditEvents).values({
        id: randomUUID(),
        organizationId: endpoint.organizationId,
        actorType: "wallet",
        actorId: session.address.toLowerCase(),
        action: "webhook.secret_rotated",
        targetType: "webhook_endpoint",
        targetId: endpointId,
        metadata: {},
      });
    });
    return NextResponse.json({ endpointId, secret });
  } catch (error) {
    return apiError(error);
  }
}
