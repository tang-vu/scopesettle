import type { EvaluationReportContent, JobSpecification } from "./schemas";

export function calculateWeightedScore(
  criteria: ReadonlyArray<{ readonly score: number; readonly weight: number }>,
): number {
  const totalWeight = criteria.reduce(
    (sum, criterion) => sum + criterion.weight,
    0,
  );
  if (totalWeight !== 100)
    throw new RangeError(`Weights must sum to 100; received ${totalWeight}`);
  const score = criteria.reduce(
    (sum, criterion) => sum + criterion.score * criterion.weight,
    0,
  );
  return Math.round(score) / 100;
}

export function determineVerdict(
  report: Pick<
    EvaluationReportContent,
    "confidence" | "deterministicChecks" | "weightedScore"
  >,
  specification: Pick<
    JobSpecification,
    "minimumConfidence" | "minimumPassingScore"
  >,
): EvaluationReportContent["verdict"] {
  const hardFailure = report.deterministicChecks.some(
    (check) => check.status === "fail",
  );
  const unavailable = report.deterministicChecks.some(
    (check) => check.status === "unavailable",
  );
  if (unavailable || report.confidence < specification.minimumConfidence)
    return "manual_review";
  if (hardFailure || report.weightedScore < specification.minimumPassingScore)
    return "fail";
  return "pass";
}
