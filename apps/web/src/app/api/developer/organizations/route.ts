import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireWalletSession } from "@/server/auth";
import { getDatabase } from "@/server/db";
import {
  auditEvents,
  organizationMembers,
  organizations,
} from "@/server/db/schema";
import { listOrganizations } from "@/server/developer-platform";
import { apiError } from "@/server/http";

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireWalletSession(request);
    return NextResponse.json({
      organizations: await listOrganizations(session.address),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireWalletSession(request);
    const body = createOrganizationSchema.parse(await request.json());
    const id = randomUUID();
    const auditId = randomUUID();
    const address = session.address.toLowerCase();
    await getDatabase().transaction(async (transaction) => {
      await transaction.insert(organizations).values({ id, name: body.name });
      await transaction.insert(organizationMembers).values({
        organizationId: id,
        address,
        role: "owner",
      });
      await transaction.insert(auditEvents).values({
        id: auditId,
        organizationId: id,
        actorType: "wallet",
        actorId: address,
        action: "organization.created",
        targetType: "organization",
        targetId: id,
        metadata: { name: body.name },
      });
    });
    return NextResponse.json(
      { organization: { id, name: body.name, role: "owner" } },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
