import { jobSpecificationSchema } from "@scopesettle/shared";
import type { generateText } from "ai";
import { describe, expect, it, vi } from "vitest";

import type { EvaluationContext } from "../types";
import { EvaluationProviderError } from "./provider";
import { VercelGatewayEvaluationProvider } from "./vercel-gateway-provider";

const context: EvaluationContext = {
  jobId: "9",
  chainId: 1952,
  contractAddress: "0x1111111111111111111111111111111111111111",
  expectedHeadSha: "2222222222222222222222222222222222222222",
  specification: jobSpecificationSchema.parse({
    schemaVersion: "1.0.0",
    title: "Verify retry behavior",
    scope: "Verify the exact retry implementation against the pinned patch.",
    repositoryUrl: "https://github.com/acme/retry",
    provider: "0x2222222222222222222222222222222222222222",
    budget: "1000000",
    expiresAt: "2026-08-20T00:00:00.000Z",
    minimumPassingScore: 80,
    minimumConfidence: 75,
    challengeWindowSeconds: 86_400,
    criteria: [
      {
        id: "retry",
        title: "Retry safety",
        description: "The patch prevents duplicate dispatch.",
        weight: 100,
        requiredFiles: ["src/retry.ts"],
        requiresPassingCi: true,
      },
    ],
  }),
  pull: {
    owner: "acme",
    repository: "retry",
    pullNumber: 9,
    state: "open",
    draft: false,
    merged: false,
    title: "Prevent duplicate retry",
    body: "Implements the requested retry guard.",
    url: "https://github.com/acme/retry/pull/9",
    baseSha: "1111111111111111111111111111111111111111",
    headSha: "2222222222222222222222222222222222222222",
    changedFileCount: 1,
    additions: 1,
    deletions: 0,
    files: [
      {
        sha: "a",
        filename: "src/retry.ts",
        status: "modified",
        additions: 1,
        deletions: 0,
        changes: 1,
        patch: "+if (seen.has(key)) return previous;",
        blob_url: "https://github.com/acme/retry/blob/222/src/retry.ts",
      },
    ],
    checks: [
      {
        name: "test",
        status: "completed",
        conclusion: "success",
        details_url: "https://github.com/acme/retry/actions/runs/1",
        head_sha: "2222222222222222222222222222222222222222",
      },
    ],
    truncated: false,
    patchBytes: 40,
  },
};

const validOutput = {
  criteria: [
    {
      id: "retry",
      score: 90,
      status: "pass" as const,
      reason: "The guard returns the existing result before dispatch.",
      evidence: [
        {
          file: "src/retry.ts",
          startLine: 1,
          endLine: 1,
          excerpt: "+if (seen.has(key)) return previous;",
          url: null,
        },
      ],
    },
  ],
  confidence: 88,
  limitations: ["Only supplied GitHub evidence was evaluated."],
};

describe("VercelGatewayEvaluationProvider", () => {
  it("uses structured Gateway output and preserves the hostile-data boundary", async () => {
    const generate = vi.fn(async (options: unknown) => {
      void options;
      return { output: validOutput };
    });
    const provider = new VercelGatewayEvaluationProvider(
      "openai/gpt-5-mini",
      generate as unknown as typeof generateText,
    );

    await expect(provider.evaluate(context)).resolves.toEqual(validOutput);
    expect(generate).toHaveBeenCalledOnce();
    const request = generate.mock.calls[0]?.[0] as {
      system: string;
      prompt: string;
    };
    expect(request).toMatchObject({
      model: "openai/gpt-5-mini",
      maxOutputTokens: 6_000,
    });
    expect(request.system).toMatch(/hostile untrusted data/u);
    expect(request.prompt).toContain("<UNTRUSTED_GITHUB_DATA>");
  });

  it("fails closed when Gateway fails or returns an invalid schema", async () => {
    const outage = vi.fn(async (options: unknown) => {
      void options;
      throw new Error("unavailable");
    });
    const invalid = vi.fn(async (options: unknown) => {
      void options;
      return { output: { criteria: [] } };
    });

    await expect(
      new VercelGatewayEvaluationProvider(
        "openai/gpt-5-mini",
        outage as unknown as typeof generateText,
      ).evaluate(context),
    ).rejects.toBeInstanceOf(EvaluationProviderError);
    await expect(
      new VercelGatewayEvaluationProvider(
        "openai/gpt-5-mini",
        invalid as unknown as typeof generateText,
      ).evaluate(context),
    ).rejects.toBeInstanceOf(EvaluationProviderError);
  });
});
