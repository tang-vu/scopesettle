import { canonicalize } from "@scopesettle/shared";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDatabase } from "@/server/db";
import { evaluationReports } from "@/server/db/schema";
import { apiError } from "@/server/http";

type RouteContext = { params: Promise<{ chainId: string; jobId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const parameters = await context.params;
    const chainId = z.coerce
      .number()
      .int()
      .positive()
      .parse(parameters.chainId);
    const jobId = BigInt(z.string().regex(/^\d+$/u).parse(parameters.jobId));
    const [saved] = await getDatabase()
      .select({ report: evaluationReports.report })
      .from(evaluationReports)
      .where(
        and(
          eq(evaluationReports.chainId, chainId),
          eq(evaluationReports.jobId, jobId),
        ),
      )
      .limit(1);
    if (!saved)
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    return new NextResponse(`${canonicalize(saved.report)}\n`, {
      headers: {
        "content-disposition": `attachment; filename="scopesettle-${chainId}-${jobId}.json"`,
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
