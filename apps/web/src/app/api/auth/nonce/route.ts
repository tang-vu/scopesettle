import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { expectedOrigin, issueNonce } from "@/server/auth";
import { apiError } from "@/server/http";

const requestSchema = z.object({
  address: z.string(),
  chainId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json());
    const origin = expectedOrigin(request);
    const challenge = await issueNonce(body.address, body.chainId, origin.host);
    return NextResponse.json({
      ...challenge,
      domain: origin.host,
      uri: origin.origin,
    });
  } catch (error) {
    return apiError(error);
  }
}
