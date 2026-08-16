import {
  hashCanonicalJson,
  type EvaluationReport,
  type EvaluationReportContent,
  type JobSpecification,
} from "@scopesettle/shared";
import { describe, expect, it, vi } from "vitest";
import type { PublicClient } from "viem";

import { parseCliArguments } from "../src/cli-options";
import { readBoundedJson } from "../src/json-input";
import { verifyJobWithReader } from "../src/verifier";

const commerce = "0x1111111111111111111111111111111111111111";
const evaluator = "0x2222222222222222222222222222222222222222";

const specification: JobSpecification = {
  schemaVersion: "1.0.0",
  title: "Implement a verified settlement endpoint",
  scope:
    "Implement the requested endpoint with validation and regression tests.",
  repositoryUrl: "https://github.com/example/project",
  provider: "0x3333333333333333333333333333333333333333",
  budget: "1000000",
  expiresAt: "2026-09-01T00:00:00.000Z",
  minimumPassingScore: 80,
  minimumConfidence: 75,
  challengeWindowSeconds: 3600,
  criteria: [
    {
      id: "behavior",
      title: "Required behavior",
      description: "The implementation satisfies the documented behavior.",
      weight: 100,
      requiredFiles: [],
      requiresPassingCi: true,
    },
  ],
};

const content: EvaluationReportContent = {
  schemaVersion: "1.0.0",
  promptVersion: "github-pr-v1",
  model: "test-model",
  generatedAt: "2026-08-16T00:00:00.000Z",
  jobId: "7",
  chainId: 1952,
  contractAddress: commerce,
  repository: {
    owner: "example",
    name: "project",
    pullNumber: 12,
    baseSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    headSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  deterministicChecks: [{ id: "ci", label: "Pinned CI", status: "pass" }],
  criteria: [
    {
      id: "behavior",
      title: "Required behavior",
      weight: 100,
      score: 90,
      status: "pass",
      reason: "The cited implementation satisfies the requested behavior.",
      evidence: [{ file: "src/settle.ts", excerpt: "return settle(input);" }],
    },
  ],
  weightedScore: 90,
  confidence: 88,
  verdict: "pass",
  limitations: ["Only the pinned public pull request was evaluated."],
};

const report: EvaluationReport = {
  ...content,
  reportHash: hashCanonicalJson(content),
};
const deliverableHash = hashCanonicalJson({
  schemaVersion: "1.0.0",
  owner: content.repository.owner,
  repository: content.repository.name,
  pullNumber: content.repository.pullNumber,
  baseSha: content.repository.baseSha,
  headSha: content.repository.headSha,
});

function createReader(jobEvaluator = evaluator) {
  const readContract = vi.fn((request: unknown) => {
    const functionName = (request as { functionName?: string }).functionName;
    if (functionName === "getJob") {
      return Promise.resolve({
        evaluator: jobEvaluator,
        deliverable: deliverableHash,
        policy: {
          rubricHash: hashCanonicalJson(specification.criteria),
          specificationHash: hashCanonicalJson(specification),
        },
      });
    }
    if (functionName === "getProposal") {
      return Promise.resolve({
        confidence: 8800,
        deliverableHash,
        outcome: 0,
        reportHash: report.reportHash,
        score: 9000,
      });
    }
    throw new Error("Unexpected contract read");
  });
  return {
    readContract: readContract as unknown as PublicClient["readContract"],
  };
}

describe("independent verifier SDK", () => {
  it("reconstructs a fully verified certificate from RPC reads", async () => {
    const certificate = await verifyJobWithReader({
      chainId: 1952,
      commerceAddress: commerce,
      evaluatorAddress: evaluator,
      jobId: 7n,
      reader: createReader(),
      report,
      specification,
      clock: () => new Date("2026-08-16T01:00:00.000Z"),
    });

    expect(certificate.generatedAt).toBe("2026-08-16T01:00:00.000Z");
    expect(certificate.verification.status).toBe("verified");
    expect(certificate.verification.checks).toHaveLength(10);
  });

  it("fails when the configured proposal contract is not the job evaluator", async () => {
    const certificate = await verifyJobWithReader({
      chainId: 1952,
      commerceAddress: commerce,
      evaluatorAddress: evaluator,
      jobId: 7n,
      reader: createReader("0x4444444444444444444444444444444444444444"),
      report,
      specification,
    });

    expect(certificate.verification.status).toBe("failed");
    expect(
      certificate.verification.checks.find(
        (item) => item.id === "evaluator_binding",
      )?.status,
    ).toBe("fail");
  });
});

describe("verifier CLI arguments", () => {
  it("parses the complete non-interactive command", () => {
    expect(
      parseCliArguments([
        "--chain-id",
        "1952",
        "--rpc-url",
        "https://rpc.example",
        "--commerce",
        commerce,
        "--evaluator",
        evaluator,
        "--job-id",
        "7",
        "--report",
        "report.json",
        "--specification",
        "specification.json",
        "--json",
      ]),
    ).toEqual({
      chainId: 1952,
      commerce,
      evaluator,
      jobId: "7",
      report: "report.json",
      rpcUrl: "https://rpc.example",
      specification: "specification.json",
      json: true,
    });
  });

  it("rejects unknown, duplicate, and incomplete options", () => {
    expect(() => parseCliArguments(["--unknown"])).toThrow(/Unknown/u);
    expect(() =>
      parseCliArguments(["--chain-id", "1952", "--chain-id", "196"]),
    ).toThrow(/Duplicate/u);
    expect(() => parseCliArguments(["--chain-id"])).toThrow(/Missing/u);
  });
});

describe("verifier CLI inputs", () => {
  it("accepts UTF-8 JSON with a byte-order mark", async () => {
    const directory = await mkdtemp(join(tmpdir(), "scopesettle-sdk-test-"));
    const path = join(directory, "input.json");
    try {
      await writeFile(path, '\uFEFF{"schemaVersion":"1.0.0"}', "utf8");
      await expect(readBoundedJson(path)).resolves.toEqual({
        schemaVersion: "1.0.0",
      });
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });
});
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
