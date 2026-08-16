import { randomUUID } from "node:crypto";

import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireWalletSession } from "@/server/auth";
import { createApiKeySecret } from "@/server/api-key-crypto";
import { getDatabase } from "@/server/db";
import { apiKeys, auditEvents } from "@/server/db/schema";
import {
  apiKeyScopes,
  assertOrganizationOwner,
} from "@/server/developer-platform";
import { apiError } from "@/server/http";

const organizationQuerySchema = z.string().uuid();
const createApiKeySchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  scopes: z.array(z.enum(apiKeyScopes)).min(1).max(apiKeyScopes.length),
  expiresAt: z.iso
    .datetime({ offset: true })
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: "API key expiry must be in the future.",
    })
    .nullable()
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireWalletSession(request);
    const organizationId = organizationQuerySchema.parse(
      request.nextUrl.searchParams.get("organizationId"),
    );
    await assertOrganizationOwner(session, organizationId);
    const keys = await getDatabase()
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        scopes: apiKeys.scopes,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.organizationId, organizationId))
      .orderBy(desc(apiKeys.createdAt));
    return NextResponse.json({ keys });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireWalletSession(request);
    const body = createApiKeySchema.parse(await request.json());
    await assertOrganizationOwner(session, body.organizationId);
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    const id = randomUUID();
    const material = createApiKeySecret();
    const scopes = [...new Set(body.scopes)].sort();
    await getDatabase().transaction(async (transaction) => {
      await transaction.insert(apiKeys).values({
        id,
        organizationId: body.organizationId,
        name: body.name,
        prefix: material.prefix,
        secretHash: material.secretHash,
        scopes,
        expiresAt,
        createdBy: session.address.toLowerCase(),
      });
      await transaction.insert(auditEvents).values({
        id: randomUUID(),
        organizationId: body.organizationId,
        actorType: "wallet",
        actorId: session.address.toLowerCase(),
        action: "api_key.created",
        targetType: "api_key",
        targetId: id,
        metadata: {
          name: body.name,
          scopes,
          expiresAt: body.expiresAt ?? null,
        },
      });
    });
    return NextResponse.json(
      {
        key: {
          id,
          name: body.name,
          prefix: material.prefix,
          scopes,
          expiresAt,
          token: material.token,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
