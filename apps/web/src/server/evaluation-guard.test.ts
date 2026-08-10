import { describe, expect, it } from "vitest";

import { evaluationRateWindow } from "./evaluation-guard";

describe("evaluation rate window", () => {
  it("aligns requests to an hourly window with an exact retry delay", () => {
    const now = Date.UTC(2026, 7, 10, 12, 34, 56, 500);
    const result = evaluationRateWindow(now);
    expect(result.startedAt.toISOString()).toBe("2026-08-10T12:00:00.000Z");
    expect(result.retryAfterSeconds).toBe(1_504);
  });

  it("never emits a zero-second retry instruction", () => {
    const boundary = Date.UTC(2026, 7, 10, 13, 0, 0, 0) - 1;
    expect(evaluationRateWindow(boundary).retryAfterSeconds).toBe(1);
  });
});
