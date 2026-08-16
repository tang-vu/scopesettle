import { describe, expect, it } from "vitest";

import {
  hashCanonicalJson,
  verifyEvaluationReport,
  type EvaluationReport,
  type EvaluationReportContent,
  type JobSpecification,
} from "../src";

const specification: JobSpecification = {
  schemaVersion: "1.0.0",
  title: "Implement a safe settlement endpoint",
  scope: "Implement the requested behavior with tests and bounded failures.",
  repositoryUrl: "https://github.com/example/project",
  provider: "0x2222222222222222222222222222222222222222",
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
  contractAddress: "0x3333333333333333333333333333333333333333",
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

describe("report verification certificate", () => {
  it("independently verifies report math, policy, bindings, and proposal", () => {
    const verification = verifyEvaluationReport(report, {
      specification,
      expectedChainId: 1952,
      expectedJobId: "7",
      expectedContractAddress: content.contractAddress,
      expectedDeliverableHash: deliverableHash,
      expectedRubricHash: hashCanonicalJson(specification.criteria),
      expectedSpecificationHash: hashCanonicalJson(specification),
      proposal: {
        deliverableHash,
        reportHash: report.reportHash,
        score: 9000,
        confidence: 8800,
        outcome: 0,
      },
    });

    expect(verification.status).toBe("verified");
    expect(verification.checks).toHaveLength(9);
    expect(verification.checks.every((item) => item.status === "pass")).toBe(
      true,
    );
  });

  it("detects tampered content even when the stored hash is unchanged", () => {
    const verification = verifyEvaluationReport(
      { ...report, weightedScore: 99 },
      { specification },
    );

    expect(verification.status).toBe("failed");
    expect(
      verification.checks.find((item) => item.id === "canonical_hash")?.status,
    ).toBe("fail");
    expect(
      verification.checks.find((item) => item.id === "weighted_score")?.status,
    ).toBe("fail");
  });

  it("detects a proposal that commits different evidence", () => {
    const verification = verifyEvaluationReport(report, {
      specification,
      proposal: {
        deliverableHash,
        reportHash:
          "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        score: 9000,
        confidence: 8800,
        outcome: 0,
      },
    });

    expect(verification.status).toBe("failed");
    expect(
      verification.checks.find((item) => item.id === "onchain_proposal")
        ?.status,
    ).toBe("fail");
  });

  it("fails closed on malformed reports", () => {
    const verification = verifyEvaluationReport({ reportHash: "not-a-hash" });
    expect(verification.status).toBe("failed");
    expect(verification.checks).toEqual([
      expect.objectContaining({ id: "report_schema", status: "fail" }),
    ]);
  });
});
