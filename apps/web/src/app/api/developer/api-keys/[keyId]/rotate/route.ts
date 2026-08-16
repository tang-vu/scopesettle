import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireWalletSession, UnauthorizedError } from "@/server/auth";
import { createApiKeySecret } from "@/server/api-key-crypto";
import { getDatabase } from "@/server/db";
import { apiKeys, auditEvents } from "@/server/db/schema";
import { assertOrganizationOwner } from "@/server/developer-platform";
import { apiError } from "@/server/http";

type RouteContext = { params: Promise<{ keyId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireWalletSession(request);
    const keyId = z
      .string()
      .uuid()
      .parse((await context.params).keyId);
    const [key] = await getDatabase()
      .select({
        name: apiKeys.name,
        organizationId: apiKeys.organizationId,
        scopes: apiKeys.scopes,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), isNull(apiKeys.revokedAt)))
      .limit(1);
    if (!key) throw new UnauthorizedError("Active API key access is denied.");
    await assertOrganizationOwner(session, key.organizationId);
    const material = createApiKeySecret();
    await getDatabase().transaction(async (transaction) => {
      const updated = await transaction
        .update(apiKeys)
        .set({
          prefix: material.prefix,
          secretHash: material.secretHash,
          lastUsedAt: null,
        })
        .where(and(eq(apiKeys.id, keyId), isNull(apiKeys.revokedAt)))
        .returning({ id: apiKeys.id });
      if (updated.length !== 1) {
        throw new UnauthorizedError("The API key is no longer active.");
      }
      await transaction.insert(auditEvents).values({
        id: randomUUID(),
        organizationId: key.organizationId,
        actorType: "wallet",
        actorId: session.address.toLowerCase(),
        action: "api_key.rotated",
        targetType: "api_key",
        targetId: keyId,
        metadata: { prefix: material.prefix },
      });
    });
    return NextResponse.json({
      key: {
        id: keyId,
        name: key.name,
        prefix: material.prefix,
        scopes: key.scopes,
        expiresAt: key.expiresAt,
        token: material.token,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
