import { and, desc, eq, lt } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireWalletSession } from "@/server/auth";
import { getDatabase } from "@/server/db";
import { auditEvents } from "@/server/db/schema";
import { assertOrganizationOwner } from "@/server/developer-platform";
import { apiError } from "@/server/http";

export async function GET(request: NextRequest) {
  try {
    const session = await requireWalletSession(request);
    const organizationId = z
      .string()
      .uuid()
      .parse(request.nextUrl.searchParams.get("organizationId"));
    const beforeValue = request.nextUrl.searchParams.get("before");
    const before = beforeValue
      ? new Date(z.iso.datetime({ offset: true }).parse(beforeValue))
      : null;
    await assertOrganizationOwner(session, organizationId);
    const events = await getDatabase()
      .select()
      .from(auditEvents)
      .where(
        before
          ? and(
              eq(auditEvents.organizationId, organizationId),
              lt(auditEvents.createdAt, before),
            )
          : eq(auditEvents.organizationId, organizationId),
      )
      .orderBy(desc(auditEvents.createdAt))
      .limit(100);
    return NextResponse.json({ events });
  } catch (error) {
    return apiError(error);
  }
}
