import type {
  EvaluationReportContent,
  JobSpecification,
} from "@scopesettle/shared";

import type { GitHubPullData } from "./github";

export type DeterministicCheck =
  EvaluationReportContent["deterministicChecks"][number];

export type EvaluationContext = {
  jobId: string;
  chainId: number;
  contractAddress: string;
  expectedHeadSha: string;
  specification: JobSpecification;
  pull: GitHubPullData;
};
