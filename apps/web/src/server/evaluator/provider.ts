import { z } from "zod";

import type { EvaluationContext } from "../types";

export const providerOutputSchema = z.object({
  criteria: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        score: z.number().min(0).max(100),
        status: z.enum(["pass", "partial", "fail", "unverifiable"]),
        reason: z.string().min(1).max(2_000),
        evidence: z
          .array(
            z.object({
              file: z.string().max(500).nullable(),
              startLine: z.number().int().positive().nullable(),
              endLine: z.number().int().positive().nullable(),
              excerpt: z.string().max(800).nullable(),
              url: z.string().max(1_000).nullable(),
            }),
          )
          .max(20),
      }),
    )
    .min(1)
    .max(12),
  confidence: z.number().min(0).max(100),
  limitations: z.array(z.string().min(1).max(500)).min(1).max(12),
});

export type ProviderOutput = z.infer<typeof providerOutputSchema>;

export interface EvaluationProvider {
  readonly name: string;
  evaluate(context: EvaluationContext): Promise<ProviderOutput>;
}

export class EvaluationProviderError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "EvaluationProviderError";
  }
}
