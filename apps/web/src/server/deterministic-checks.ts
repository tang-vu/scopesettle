import type { JobSpecification } from "@scopesettle/shared";

import type { DeterministicCheck } from "./types";
import {
  MAX_CHANGED_FILES,
  MAX_CHANGED_LINES,
  MAX_PATCH_BYTES,
  type GitHubPullData,
} from "./github";

export type GateResult = {
  checks: DeterministicCheck[];
  requiresManualReview: boolean;
  limitations: string[];
};

function check(
  id: string,
  label: string,
  status: DeterministicCheck["status"],
  evidence: string,
): DeterministicCheck {
  return { id, label, status, evidence };
}

export function runDeterministicChecks(
  specification: JobSpecification,
  pull: GitHubPullData,
  expectedHeadSha: string,
): GateResult {
  const expectedRepository = new URL(specification.repositoryUrl).pathname
    .replace(/^\//u, "")
    .replace(/\.git$/u, "")
    .toLowerCase();
  const actualRepository = `${pull.owner}/${pull.repository}`.toLowerCase();
  const identityMatches = expectedRepository === actualRepository;
  const shaMatches = pull.headSha === expectedHeadSha;
  const changedLines = pull.additions + pull.deletions;
  const withinBounds =
    pull.changedFileCount <= MAX_CHANGED_FILES &&
    changedLines <= MAX_CHANGED_LINES &&
    pull.patchBytes <= MAX_PATCH_BYTES &&
    !pull.truncated;
  const binaryFiles = pull.files.filter((file) => file.patch === undefined);
  const requiredFiles = specification.criteria.flatMap(
    (criterion) => criterion.requiredFiles,
  );
  const missingFiles = [...new Set(requiredFiles)].filter(
    (required) => !pull.files.some((file) => file.filename === required),
  );
  const requiresCi = specification.criteria.some(
    (criterion) => criterion.requiresPassingCi,
  );
  const completedChecks = pull.checks.filter(
    (item) => item.status === "completed",
  );
  const failingChecks = completedChecks.filter(
    (item) =>
      !["success", "neutral", "skipped"].includes(item.conclusion ?? ""),
  );
  const pendingChecks = pull.checks.filter(
    (item) => item.status !== "completed",
  );
  const ciPasses =
    !requiresCi ||
    (completedChecks.length > 0 &&
      failingChecks.length === 0 &&
      pendingChecks.length === 0);
  const deletedTests = pull.files.filter(
    (file) =>
      file.status === "removed" &&
      /(^|\/)(__tests__|test|tests|spec)(\/|\.|$)/iu.test(file.filename),
  );

  const checks: DeterministicCheck[] = [
    check(
      "repository_identity",
      "Repository and PR identity",
      identityMatches ? "pass" : "fail",
      identityMatches
        ? `Public PR resolves to ${actualRepository}.`
        : `Expected ${expectedRepository}; GitHub returned ${actualRepository}.`,
    ),
    check(
      "pinned_commit",
      "Immutable head commit",
      shaMatches ? "pass" : "fail",
      shaMatches
        ? `PR head matches submitted commit ${pull.headSha}.`
        : `Submitted ${expectedHeadSha}; current PR head is ${pull.headSha}.`,
    ),
    check(
      "pr_state",
      "Pull request state",
      pull.draft ? "warning" : "pass",
      `PR is ${pull.state}${pull.draft ? " and marked draft" : ""}${pull.merged ? " and merged" : ""}.`,
    ),
    check(
      "evaluation_bounds",
      "Evaluation bounds",
      withinBounds ? "pass" : "unavailable",
      `${pull.changedFileCount} files, ${changedLines} changed lines, ${pull.patchBytes} patch bytes${pull.truncated ? "; file list truncated" : ""}.`,
    ),
    check(
      "binary_patches",
      "Text diff availability",
      binaryFiles.length === 0 ? "pass" : "unavailable",
      binaryFiles.length === 0
        ? "All changed files include inspectable text patches."
        : `${binaryFiles.length} changed file(s) lack an inspectable text patch.`,
    ),
    check(
      "required_files",
      "Required files",
      missingFiles.length === 0 ? "pass" : "fail",
      missingFiles.length === 0
        ? `${requiredFiles.length} required path commitment(s) are present.`
        : `Missing required paths: ${missingFiles.join(", ")}.`,
    ),
    check(
      "github_checks",
      "GitHub checks for pinned commit",
      ciPasses ? "pass" : pendingChecks.length > 0 ? "unavailable" : "fail",
      `${completedChecks.length} completed, ${failingChecks.length} failing, ${pendingChecks.length} pending for ${pull.headSha}.`,
    ),
    check(
      "deleted_tests",
      "Deleted test files",
      deletedTests.length === 0 ? "pass" : "warning",
      deletedTests.length === 0
        ? "No test-like file was deleted."
        : `Deleted test-like paths: ${deletedTests.map((file) => file.filename).join(", ")}.`,
    ),
  ];

  const limitations: string[] = [];
  if (!withinBounds)
    limitations.push(
      "Diff exceeds automatic-evaluation bounds and requires manual review.",
    );
  if (binaryFiles.length > 0)
    limitations.push("Binary or unavailable patches could not be inspected.");
  if (pull.checks.length === 0)
    limitations.push("GitHub returned no check runs for the pinned commit.");
  limitations.push(
    "GitHub CI is repository-controlled and may be incomplete or maliciously configured.",
  );

  return {
    checks,
    requiresManualReview:
      !identityMatches ||
      !shaMatches ||
      checks.some((item) => item.status === "unavailable"),
    limitations,
  };
}
