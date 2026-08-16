import { canonicalize } from "@scopesettle/shared";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { recordApiKeyAudit, requireApiKey } from "@/server/developer-platform";
import { apiError } from "@/server/http";
import { createJobVerification } from "@/server/verification";

type RouteContext = { params: Promise<{ chainId: string; jobId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const principal = await requireApiKey(request, "reports:read");
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
    await recordApiKeyAudit({
      principal,
      action: "verification.read",
      targetType: "job",
      targetId: `${chainId}:${jobId}`,
    });
    return new NextResponse(`${canonicalize(certificate)}\n`, {
      headers: {
        "cache-control": "private, no-store",
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
