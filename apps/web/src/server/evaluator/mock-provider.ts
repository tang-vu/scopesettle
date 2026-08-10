import type { EvaluationContext } from "../types";
import type { EvaluationProvider, ProviderOutput } from "./provider";

/// Deterministic test fixture. Construction is prohibited in production.
export class DeterministicTestProvider implements EvaluationProvider {
  readonly name = "deterministic-test-provider";

  constructor(private readonly output?: ProviderOutput) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DeterministicTestProvider is forbidden in production");
    }
  }

  async evaluate(context: EvaluationContext): Promise<ProviderOutput> {
    if (this.output) return structuredClone(this.output);
    return {
      criteria: context.specification.criteria.map((criterion) => {
        const file =
          context.pull.files.find((candidate) => candidate.patch)?.filename ??
          null;
        const patch = context.pull.files.find(
          (candidate) => candidate.filename === file,
        )?.patch;
        return {
          id: criterion.id,
          score: file ? 90 : 0,
          status: file ? ("pass" as const) : ("unverifiable" as const),
          reason: file
            ? "The bounded fixture contains direct changed-file evidence."
            : "No text patch.",
          evidence: file
            ? [
                {
                  file,
                  startLine: 1,
                  endLine: 1,
                  excerpt: patch?.slice(0, 80) ?? null,
                  url: null,
                },
              ]
            : [],
        };
      }),
      confidence: 90,
      limitations: [
        "Deterministic provider output is valid only in automated tests.",
      ],
    };
  }
}
