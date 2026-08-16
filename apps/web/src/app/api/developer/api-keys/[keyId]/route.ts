import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireWalletSession, UnauthorizedError } from "@/server/auth";
import { getDatabase } from "@/server/db";
import { apiKeys, auditEvents } from "@/server/db/schema";
import { assertOrganizationOwner } from "@/server/developer-platform";
import { apiError } from "@/server/http";

type RouteContext = { params: Promise<{ keyId: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireWalletSession(request);
    const keyId = z
      .string()
      .uuid()
      .parse((await context.params).keyId);
    const [key] = await getDatabase()
      .select({ organizationId: apiKeys.organizationId })
      .from(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .limit(1);
    if (!key) throw new UnauthorizedError("API key access is denied.");
    await assertOrganizationOwner(session, key.organizationId);
    const revokedAt = new Date();
    const rows = await getDatabase().transaction(async (transaction) => {
      const updated = await transaction
        .update(apiKeys)
        .set({ revokedAt })
        .where(and(eq(apiKeys.id, keyId), isNull(apiKeys.revokedAt)))
        .returning({ id: apiKeys.id });
      if (updated.length === 1) {
        await transaction.insert(auditEvents).values({
          id: randomUUID(),
          organizationId: key.organizationId,
          actorType: "wallet",
          actorId: session.address.toLowerCase(),
          action: "api_key.revoked",
          targetType: "api_key",
          targetId: keyId,
          metadata: {},
        });
      }
      return updated;
    });
    if (rows.length !== 1) {
      return NextResponse.json({ status: "already_revoked" });
    }
    return NextResponse.json({ status: "revoked", revokedAt });
  } catch (error) {
    return apiError(error);
  }
}
