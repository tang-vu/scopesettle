import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { z } from "zod";

import {
  assertSupportedChain,
  consumeNonce,
  createSession,
  expectedOrigin,
  SESSION_COOKIE,
  UnauthorizedError,
} from "@/server/auth";
import { apiError } from "@/server/http";

const requestSchema = z.object({
  message: z.string().min(1).max(4_000),
  signature: z.string().regex(/^0x[\da-fA-F]+$/u),
});

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json());
    const message = new SiweMessage(body.message);
    const origin = expectedOrigin(request);
    assertSupportedChain(message.chainId);
    if (message.uri !== origin.origin)
      throw new UnauthorizedError("The sign-in URI is invalid.");
    const result = await message.verify(
      { signature: body.signature, domain: origin.host, nonce: message.nonce },
      { suppressExceptions: true },
    );
    if (!result.success)
      throw new UnauthorizedError("The wallet signature is invalid.");
    await consumeNonce({
      address: message.address,
      chainId: message.chainId,
      domain: origin.host,
      nonce: message.nonce,
    });
    const session = await createSession(message.address, message.chainId);
    const response = NextResponse.json({
      address: message.address,
      chainId: message.chainId,
    });
    response.cookies.set(SESSION_COOKIE, session.token, {
      expires: session.expiresAt,
      httpOnly: true,
      sameSite: "lax",
      secure: origin.protocol === "https:",
      path: "/",
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
