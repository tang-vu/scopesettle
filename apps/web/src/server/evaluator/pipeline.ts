import {
  calculateWeightedScore,
  determineVerdict,
  evaluationReportContentSchema,
  evaluationReportSchema,
  hashCanonicalJson,
  type EvaluationReport,
  type EvaluationReportContent,
} from "@scopesettle/shared";

import { runDeterministicChecks } from "../deterministic-checks";
import type { EvaluationContext } from "../types";
import type { EvaluationProvider, ProviderOutput } from "./provider";

function manualCriteria(
  context: EvaluationContext,
  reason: string,
): EvaluationReportContent["criteria"] {
  return context.specification.criteria.map((criterion) => ({
    id: criterion.id,
    title: criterion.title,
    weight: criterion.weight,
    score: 0,
    status: "unverifiable",
    reason,
    evidence: [],
  }));
}

function validateEvidence(
  context: EvaluationContext,
  output: ProviderOutput,
): {
  criteria: EvaluationReportContent["criteria"];
  evidenceConfidence: number;
} {
  const expectedIds = new Set(
    context.specification.criteria.map((criterion) => criterion.id),
  );
  const returnedIds = output.criteria.map((criterion) => criterion.id);
  if (
    returnedIds.length !== expectedIds.size ||
    new Set(returnedIds).size !== returnedIds.length ||
    returnedIds.some((id) => !expectedIds.has(id))
  ) {
    throw new Error(
      "Provider criteria do not exactly match the immutable rubric",
    );
  }

  let evidenced = 0;
  const criteria = context.specification.criteria.map((source) => {
    const result = output.criteria.find(
      (candidate) => candidate.id === source.id,
    );
    if (!result) throw new Error(`Provider omitted criterion ${source.id}`);
    const evidence = result.evidence.flatMap((item) => {
      if (item.file) {
        const changedFile = context.pull.files.find(
          (file) => file.filename === item.file,
        );
        if (!changedFile) return [];
        if (item.excerpt && !changedFile.patch?.includes(item.excerpt))
          return [];
      } else if (item.url) {
        try {
          if (new URL(item.url).hostname.toLowerCase() !== "github.com")
            return [];
        } catch {
          return [];
        }
      } else {
        return [];
      }
      return [
        {
          ...(item.file ? { file: item.file } : {}),
          ...(item.startLine ? { startLine: item.startLine } : {}),
          ...(item.endLine ? { endLine: item.endLine } : {}),
          ...(item.excerpt ? { excerpt: item.excerpt } : {}),
          ...(item.url ? { url: item.url } : {}),
        },
      ];
    });
    if (evidence.length === 0) {
      return {
        id: source.id,
        title: source.title,
        weight: source.weight,
        score: 0,
        status: "unverifiable" as const,
        reason: `${result.reason} No supplied citation matched the pinned changed-file evidence.`,
        evidence: [],
      };
    }
    evidenced += 1;
    return {
      id: source.id,
      title: source.title,
      weight: source.weight,
      score: result.score,
      status: result.status,
      reason: result.reason,
      evidence,
    };
  });

  return {
    criteria,
    evidenceConfidence: Math.round(
      (evidenced / context.specification.criteria.length) * 100,
    ),
  };
}

function finalizeReport(content: EvaluationReportContent): EvaluationReport {
  const parsedContent = evaluationReportContentSchema.parse(content);
  return evaluationReportSchema.parse({
    ...parsedContent,
    reportHash: hashCanonicalJson(parsedContent),
  });
}

export async function evaluatePullRequest(
  context: EvaluationContext,
  provider: EvaluationProvider,
  clock: () => Date = () => new Date(),
): Promise<EvaluationReport> {
  const gate = runDeterministicChecks(
    context.specification,
    context.pull,
    context.expectedHeadSha,
  );
  const base = {
    schemaVersion: "1.0.0" as const,
    promptVersion: "github-pr-v1",
    generatedAt: clock().toISOString(),
    jobId: context.jobId,
    chainId: context.chainId,
    contractAddress: context.contractAddress,
    repository: {
      owner: context.pull.owner,
      name: context.pull.repository,
      pullNumber: context.pull.pullNumber,
      baseSha: context.pull.baseSha,
      headSha: context.pull.headSha,
    },
  };

  if (gate.requiresManualReview) {
    const criteria = manualCriteria(
      context,
      "Automatic model evaluation was skipped by a deterministic gate.",
    );
    return finalizeReport({
      ...base,
      model: "not-run:deterministic-gate",
      deterministicChecks: gate.checks,
      criteria,
      weightedScore: calculateWeightedScore(criteria),
      confidence: 0,
      verdict: "manual_review",
      limitations: gate.limitations,
    });
  }

  try {
    const output = await provider.evaluate(context);
    const validated = validateEvidence(context, output);
    const weightedScore = calculateWeightedScore(validated.criteria);
    const confidence = Math.min(
      output.confidence,
      validated.evidenceConfidence,
    );
    const provisional = {
      deterministicChecks: gate.checks,
      weightedScore,
      confidence,
    };
    return finalizeReport({
      ...base,
      model: provider.name,
      deterministicChecks: gate.checks,
      criteria: validated.criteria,
      weightedScore,
      confidence,
      verdict: determineVerdict(provisional, context.specification),
      limitations: [...new Set([...gate.limitations, ...output.limitations])],
    });
  } catch (error) {
    const criteria = manualCriteria(
      context,
      "The configured evaluation provider failed or returned an invalid evidence schema.",
    );
    return finalizeReport({
      ...base,
      model: provider.name,
      deterministicChecks: [
        ...gate.checks,
        {
          id: "model_provider",
          label: "Structured AI evaluation",
          status: "unavailable",
          evidence:
            "Provider failure was handled fail-closed; no production mock was substituted.",
        },
      ],
      criteria,
      weightedScore: calculateWeightedScore(criteria),
      confidence: 0,
      verdict: "manual_review",
      limitations: [
        ...gate.limitations,
        error instanceof Error
          ? `Evaluation unavailable: ${error.message}`
          : "Evaluation unavailable.",
      ],
    });
  }
}
