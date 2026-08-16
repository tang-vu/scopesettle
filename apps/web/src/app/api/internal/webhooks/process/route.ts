import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiError } from "@/server/http";
import { requireCronSecret } from "@/server/internal-auth";
import { processWebhookOutbox } from "@/server/webhook-outbox";

export const maxDuration = 60;

async function process(request: NextRequest) {
  try {
    requireCronSecret(request);
    return NextResponse.json(await processWebhookOutbox(10));
  } catch (error) {
    return apiError(error);
  }
}

export const GET = process;
export const POST = process;
