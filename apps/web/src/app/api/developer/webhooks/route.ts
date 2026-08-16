import { randomUUID } from "node:crypto";

import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireWalletSession } from "@/server/auth";
import { getDatabase } from "@/server/db";
import { getDeployment } from "@/server/chain";
import { auditEvents, webhookEndpoints } from "@/server/db/schema";
import { assertOrganizationOwner } from "@/server/developer-platform";
import { apiError } from "@/server/http";
import {
  createWebhookSecret,
  encryptWebhookSecret,
} from "@/server/webhook-crypto";
import {
  parseWebhookUrl,
  resolvePublicWebhookTarget,
} from "@/server/webhook-security";

export const webhookSubscriptionEvents = [
  "job.created",
  "deliverable.submitted",
  "evaluation.completed",
] as const;

const createWebhookSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  url: z.url().max(2_000),
  eventTypes: z
    .array(z.enum(webhookSubscriptionEvents))
    .min(1)
    .max(webhookSubscriptionEvents.length),
  chainId: z.number().int().positive(),
  jobId: z.string().regex(/^\d+$/u),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireWalletSession(request);
    const organizationId = z
      .string()
      .uuid()
      .parse(request.nextUrl.searchParams.get("organizationId"));
    await assertOrganizationOwner(session, organizationId);
    const endpoints = await getDatabase()
      .select({
        id: webhookEndpoints.id,
        name: webhookEndpoints.name,
        url: webhookEndpoints.url,
        eventTypes: webhookEndpoints.eventTypes,
        chainId: webhookEndpoints.chainId,
        jobId: webhookEndpoints.jobId,
        active: webhookEndpoints.active,
        createdAt: webhookEndpoints.createdAt,
        updatedAt: webhookEndpoints.updatedAt,
      })
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.organizationId, organizationId))
      .orderBy(desc(webhookEndpoints.createdAt));
    return NextResponse.json({
      endpoints: endpoints.map((endpoint) => ({
        ...endpoint,
        jobId: endpoint.jobId.toString(),
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireWalletSession(request);
    const body = createWebhookSchema.parse(await request.json());
    await assertOrganizationOwner(session, body.organizationId);
    getDeployment(body.chainId);
    const url = parseWebhookUrl(body.url);
    await resolvePublicWebhookTarget(url);
    const jobId = BigInt(body.jobId);
    const id = randomUUID();
    const secret = createWebhookSecret();
    const encrypted = encryptWebhookSecret(secret);
    const eventTypes = [...new Set(body.eventTypes)].sort();
    await getDatabase().transaction(async (transaction) => {
      await transaction.insert(webhookEndpoints).values({
        id,
        organizationId: body.organizationId,
        name: body.name,
        url: url.href,
        eventTypes,
        chainId: body.chainId,
        jobId,
        secretCiphertext: encrypted.ciphertext,
        secretIv: encrypted.iv,
        secretTag: encrypted.tag,
        createdBy: session.address.toLowerCase(),
      });
      await transaction.insert(auditEvents).values({
        id: randomUUID(),
        organizationId: body.organizationId,
        actorType: "wallet",
        actorId: session.address.toLowerCase(),
        action: "webhook.created",
        targetType: "webhook_endpoint",
        targetId: id,
        metadata: {
          chainId: body.chainId,
          jobId: body.jobId,
          eventTypes,
          host: url.hostname,
        },
      });
    });
    return NextResponse.json(
      {
        endpoint: {
          id,
          name: body.name,
          url: url.href,
          eventTypes,
          chainId: body.chainId,
          jobId: body.jobId,
          active: true,
          secret,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
