import { privateKeyToAccount } from "viem/accounts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { exampleReport } from "@/lib/example-data";

const privateKey = `0x${"11".repeat(32)}` as `0x${string}`;
const deliverableHash = `0x${"aa".repeat(32)}` as `0x${string}`;
const signer = privateKeyToAccount(privateKey).address;

vi.mock("./chain", () => ({
  getDeployment: () => ({
    chainId: 1952,
    commerce: "0x1111111111111111111111111111111111111111",
    evaluator: "0x2222222222222222222222222222222222222222",
    paymentToken: "0x3333333333333333333333333333333333333333",
  }),
  readEvaluatorSigner: () => Promise.resolve(signer),
}));

describe("verdict signer", () => {
  afterEach(() => {
    delete process.env.EVALUATOR_PRIVATE_KEY;
  });

  it("converts application percentages to contract basis points and signs", async () => {
    process.env.EVALUATOR_PRIVATE_KEY = privateKey;
    const { signEvaluationVerdict } = await import("./verdict");
    const verdict = await signEvaluationVerdict({
      chainId: 1952,
      challengeWindow: 300n,
      deliverableHash,
      expiresAt: BigInt(Math.floor(Date.now() / 1_000) + 3_600),
      jobId: 42n,
      report: exampleReport,
    });
    expect(verdict.score).toBe(9130);
    expect(verdict.confidence).toBe(87_000 / 10);
    expect(verdict.outcome).toBe(0);
    expect(verdict.signature).toMatch(/^0x[\da-f]{130}$/u);
  });

  it("fails closed without a server-side private key", async () => {
    const { signEvaluationVerdict } = await import("./verdict");
    await expect(
      signEvaluationVerdict({
        chainId: 1952,
        challengeWindow: 300n,
        deliverableHash,
        expiresAt: 2_000_000_000n,
        jobId: 1n,
        report: exampleReport,
      }),
    ).rejects.toThrow("not configured");
  });
});
