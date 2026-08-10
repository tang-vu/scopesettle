import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { DatabaseUnavailableError } from "./db";

export class RateLimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid request",
        issues: error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }
  if (error instanceof DatabaseUnavailableError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof Error && error.name === "UnauthorizedError") {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof Error && error.name === "ConflictError") {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message },
      {
        headers: { "Retry-After": error.retryAfterSeconds.toString() },
        status: 429,
      },
    );
  }
  // Do not leak provider, database, signature, or RPC internals to clients.
  console.error("ScopeSettle request failed", {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown failure",
  });
  return NextResponse.json(
    { error: "The request could not be completed." },
    { status: 500 },
  );
}
