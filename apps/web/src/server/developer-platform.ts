import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getAddress } from "viem";

import { UnauthorizedError, type WalletSession } from "./auth";
import { apiKeyDigestMatches, apiKeyPrefix } from "./api-key-crypto";
import { getDatabase } from "./db";
import {
  apiKeys,
  auditEvents,
  organizationMembers,
  organizations,
  type ApiKeyScope,
} from "./db/schema";

export const apiKeyScopes = [
  "jobs:read",
  "reports:read",
  "webhooks:manage",
] as const satisfies readonly ApiKeyScope[];

export type ApiKeyPrincipal = {
  apiKeyId: string;
  organizationId: string;
  scopes: ApiKeyScope[];
};

export async function assertOrganizationOwner(
  session: WalletSession,
  organizationId: string,
): Promise<void> {
  const [membership] = await getDatabase()
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.address, session.address.toLowerCase()),
        eq(organizationMembers.role, "owner"),
      ),
    )
    .limit(1);
  if (!membership) {
    throw new UnauthorizedError("Organization owner access is required.");
  }
}

export async function recordWalletAudit(input: {
  session: WalletSession;
  organizationId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await getDatabase()
    .insert(auditEvents)
    .values({
      id: randomUUID(),
      organizationId: input.organizationId,
      actorType: "wallet",
      actorId: getAddress(input.session.address).toLowerCase(),
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata ?? {},
    });
}

export async function recordApiKeyAudit(input: {
  principal: ApiKeyPrincipal;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await getDatabase()
    .insert(auditEvents)
    .values({
      id: randomUUID(),
      organizationId: input.principal.organizationId,
      actorType: "api_key",
      actorId: input.principal.apiKeyId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata ?? {},
    });
}

export async function requireApiKey(
  request: NextRequest,
  requiredScope: ApiKeyScope,
): Promise<ApiKeyPrincipal> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer (\S+)$/u)?.[1];
  const prefix = token ? apiKeyPrefix(token) : null;
  if (!token || !prefix)
    throw new UnauthorizedError("A valid API key is required.");

  const now = new Date();
  const [key] = await getDatabase()
    .select({
      id: apiKeys.id,
      organizationId: apiKeys.organizationId,
      scopes: apiKeys.scopes,
      secretHash: apiKeys.secretHash,
    })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.prefix, prefix),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now)),
      ),
    )
    .limit(1);

  if (!key || !apiKeyDigestMatches(token, key.secretHash)) {
    throw new UnauthorizedError("The API key is invalid or revoked.");
  }
  if (!key.scopes.includes(requiredScope)) {
    throw new UnauthorizedError(`The API key lacks ${requiredScope} scope.`);
  }

  await getDatabase()
    .update(apiKeys)
    .set({ lastUsedAt: now })
    .where(eq(apiKeys.id, key.id));
  return {
    apiKeyId: key.id,
    organizationId: key.organizationId,
    scopes: key.scopes,
  };
}

export async function listOrganizations(address: string) {
  return getDatabase()
    .select({
      id: organizations.id,
      name: organizations.name,
      role: organizationMembers.role,
      createdAt: organizations.createdAt,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizations.id, organizationMembers.organizationId),
    )
    .where(eq(organizationMembers.address, getAddress(address).toLowerCase()))
    .orderBy(desc(organizations.createdAt));
}
