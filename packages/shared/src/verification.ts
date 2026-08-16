import { getAddress } from "viem";

import { hashCanonicalJson } from "./canonical";
import {
  evaluationReportSchema,
  type EvaluationReport,
  type JobSpecification,
} from "./schemas";
import { calculateWeightedScore, determineVerdict } from "./scoring";

export type VerificationStatus = "pass" | "fail" | "unavailable";

export type VerificationCheck = {
  id: string;
  label: string;
  status: VerificationStatus;
  detail: string;
};

export type OnchainProposalEvidence = {
  deliverableHash: string;
  reportHash: string;
  score: number;
  confidence: number;
  outcome: number;
};

export type ReportVerification = {
  schemaVersion: "1.0.0";
  status: "verified" | "partial" | "failed";
  checks: VerificationCheck[];
};

type VerificationContext = {
  specification?: JobSpecification;
  expectedChainId?: number;
  expectedJobId?: string;
  expectedContractAddress?: string;
  expectedDeliverableHash?: string;
  expectedSpecificationHash?: string;
  expectedRubricHash?: string;
  proposal?: OnchainProposalEvidence | null;
};

function unavailable(id: string, label: string, detail: string) {
  return { id, label, status: "unavailable", detail } as const;
}

function check(
  id: string,
  label: string,
  matches: boolean,
  passDetail: string,
  failDetail: string,
) {
  return {
    id,
    label,
    status: matches ? ("pass" as const) : ("fail" as const),
    detail: matches ? passDetail : failDetail,
  };
}

function reportContent(report: EvaluationReport) {
  return Object.fromEntries(
    Object.entries(report).filter(([key]) => key !== "reportHash"),
  );
}

function sameAddress(left: string, right: string): boolean {
  try {
    return getAddress(left) === getAddress(right);
  } catch {
    return false;
  }
}

export function verifyEvaluationReport(
  candidate: unknown,
  context: VerificationContext = {},
): ReportVerification {
  const parsed = evaluationReportSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      schemaVersion: "1.0.0",
      status: "failed",
      checks: [
        {
          id: "report_schema",
          label: "Canonical report schema",
          status: "fail",
          detail: `The report failed schema validation: ${parsed.error.issues[0]?.message ?? "invalid report"}.`,
        },
      ],
    };
  }

  const report = parsed.data;
  const checks: VerificationCheck[] = [
    {
      id: "report_schema",
      label: "Canonical report schema",
      status: "pass",
      detail:
        "The complete report satisfies the public ScopeSettle 1.0.0 schema.",
    },
  ];
  const computedHash = hashCanonicalJson(reportContent(report));
  checks.push(
    check(
      "canonical_hash",
      "Canonical report hash",
      computedHash === report.reportHash,
      `Canonical JSON recomputes to ${computedHash}.`,
      `Canonical JSON recomputes to ${computedHash}, not ${report.reportHash}.`,
    ),
  );

  let weightedScore: number | null = null;
  try {
    weightedScore = calculateWeightedScore(report.criteria);
  } catch {
    // The schema permits individual weights but the verification certificate
    // must surface an invalid aggregate as a failed deterministic check.
  }
  checks.push(
    check(
      "weighted_score",
      "Deterministic score arithmetic",
      weightedScore === report.weightedScore,
      `Criterion weights independently recompute to ${report.weightedScore}.`,
      weightedScore === null
        ? "Criterion weights do not sum to 100."
        : `Criteria recompute to ${weightedScore}, not ${report.weightedScore}.`,
    ),
  );

  if (context.specification) {
    const specificationHash = hashCanonicalJson(context.specification);
    const rubricHash = hashCanonicalJson(context.specification.criteria);
    const hasCommitmentContext =
      context.expectedSpecificationHash !== undefined &&
      context.expectedRubricHash !== undefined;
    checks.push(
      hasCommitmentContext
        ? check(
            "specification_commitment",
            "Funded specification commitment",
            specificationHash === context.expectedSpecificationHash &&
              rubricHash === context.expectedRubricHash,
            "The complete specification and rubric recompute to the onchain commitments.",
            "The indexed specification or rubric does not match its onchain commitment.",
          )
        : unavailable(
            "specification_commitment",
            "Funded specification commitment",
            "The onchain specification commitments were not supplied.",
          ),
    );
    const expectedRubric = context.specification.criteria.map(
      ({ id, title, weight }) => ({ id, title, weight }),
    );
    const reportedRubric = report.criteria.map(({ id, title, weight }) => ({
      id,
      title,
      weight,
    }));
    checks.push(
      check(
        "rubric_binding",
        "Report rubric alignment",
        JSON.stringify(reportedRubric) === JSON.stringify(expectedRubric),
        "Every reported criterion ID, title, order, and weight matches the funded rubric.",
        "The report criteria do not exactly match the funded rubric.",
      ),
    );
    const expectedVerdict = determineVerdict(report, context.specification);
    checks.push(
      check(
        "policy_verdict",
        "Locked settlement policy",
        expectedVerdict === report.verdict,
        `The locked thresholds and gate precedence independently produce “${report.verdict}”.`,
        `The locked policy produces “${expectedVerdict}”, not “${report.verdict}”.`,
      ),
    );
  } else {
    checks.push(
      unavailable(
        "rubric_binding",
        "Report rubric alignment",
        "The funded specification was not supplied to this verification run.",
      ),
      unavailable(
        "policy_verdict",
        "Locked settlement policy",
        "The funded thresholds were not supplied to this verification run.",
      ),
    );
  }

  const identityExpectations = [
    context.expectedChainId === undefined ||
      report.chainId === context.expectedChainId,
    context.expectedJobId === undefined ||
      report.jobId === context.expectedJobId,
    context.expectedContractAddress === undefined ||
      sameAddress(report.contractAddress, context.expectedContractAddress),
  ];
  const hasIdentityContext =
    context.expectedChainId !== undefined ||
    context.expectedJobId !== undefined ||
    context.expectedContractAddress !== undefined;
  checks.push(
    hasIdentityContext
      ? check(
          "job_binding",
          "Chain, contract, and job binding",
          identityExpectations.every(Boolean),
          "The report names the expected chain, commerce contract, and job.",
          "The report identity does not match the requested onchain job.",
        )
      : unavailable(
          "job_binding",
          "Chain, contract, and job binding",
          "No expected onchain identity was supplied.",
        ),
  );

  const deliverableHash = hashCanonicalJson({
    schemaVersion: "1.0.0",
    owner: report.repository.owner,
    repository: report.repository.name,
    pullNumber: report.repository.pullNumber,
    baseSha: report.repository.baseSha,
    headSha: report.repository.headSha,
  });
  checks.push(
    context.expectedDeliverableHash
      ? check(
          "deliverable_binding",
          "Pinned deliverable binding",
          deliverableHash === context.expectedDeliverableHash,
          `The exact repository and commit recompute to ${deliverableHash}.`,
          `The report repository recomputes to ${deliverableHash}, not the submitted commitment.`,
        )
      : unavailable(
          "deliverable_binding",
          "Pinned deliverable binding",
          "No submitted deliverable commitment was supplied.",
        ),
  );

  if (context.proposal) {
    const expectedOutcome = { pass: 0, fail: 1, manual_review: 2 }[
      report.verdict
    ];
    const proposalMatches =
      context.proposal.reportHash === report.reportHash &&
      context.proposal.deliverableHash === deliverableHash &&
      context.proposal.score === Math.round(report.weightedScore * 100) &&
      context.proposal.confidence === Math.round(report.confidence * 100) &&
      context.proposal.outcome === expectedOutcome;
    checks.push(
      check(
        "onchain_proposal",
        "Onchain verdict commitment",
        proposalMatches,
        "The evaluator proposal commits the same report, deliverable, score, confidence, and outcome.",
        "The evaluator proposal differs from the independently recomputed report evidence.",
      ),
    );
  } else {
    checks.push(
      unavailable(
        "onchain_proposal",
        "Onchain verdict commitment",
        "No evaluator proposal exists for this job yet.",
      ),
    );
  }

  const statuses = checks.map(({ status }) => status);
  return {
    schemaVersion: "1.0.0",
    status: statuses.includes("fail")
      ? "failed"
      : statuses.includes("unavailable")
        ? "partial"
        : "verified",
    checks,
  };
}
