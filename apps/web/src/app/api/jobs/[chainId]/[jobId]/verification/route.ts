import { canonicalize } from "@scopesettle/shared";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/server/http";
import { createJobVerification } from "@/server/verification";

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
    const certificate = await createJobVerification(chainId, jobId);
    if (!certificate) {
      return NextResponse.json(
        { error: "Verification evidence was not found." },
        { status: 404 },
      );
    }
    return new NextResponse(`${canonicalize(certificate)}\n`, {
      headers: {
        "content-disposition": `attachment; filename="scopesettle-verification-${chainId}-${jobId}.json"`,
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
