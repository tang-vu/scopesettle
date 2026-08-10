import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { readJob } from "@/server/chain";
import { getDatabase } from "@/server/db";
import { evaluationReports, jobDocuments } from "@/server/db/schema";
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
    const [{ job }, rows, reports] = await Promise.all([
      readJob(chainId, jobId),
      getDatabase()
        .select()
        .from(jobDocuments)
        .where(
          and(eq(jobDocuments.chainId, chainId), eq(jobDocuments.jobId, jobId)),
        )
        .limit(1),
      getDatabase()
        .select()
        .from(evaluationReports)
        .where(
          and(
            eq(evaluationReports.chainId, chainId),
            eq(evaluationReports.jobId, jobId),
          ),
        )
        .limit(1),
    ]);
    if (!rows[0])
      return NextResponse.json(
        { error: "Job metadata was not found." },
        { status: 404 },
      );
    return NextResponse.json({
      document: rows[0],
      onchain: {
        ...job,
        budget: job.budget.toString(),
        expiredAt: job.expiredAt.toString(),
        id: job.id.toString(),
      },
      evaluation: reports[0] ?? null,
    });
  } catch (error) {
    return apiError(error);
  }
}
