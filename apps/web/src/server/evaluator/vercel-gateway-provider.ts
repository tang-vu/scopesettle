import { generateText, Output } from "ai";
import "server-only";

import type { EvaluationContext } from "../types";
import {
  evaluationSystemInstructions,
  evaluationTaskPrompt,
} from "./openai-provider";
import {
  EvaluationProviderError,
  providerOutputSchema,
  type EvaluationProvider,
  type ProviderOutput,
} from "./provider";

export class VercelGatewayEvaluationProvider implements EvaluationProvider {
  readonly name: string;

  constructor(
    model = process.env.AI_GATEWAY_MODEL,
    private readonly generate: typeof generateText = generateText,
  ) {
    if (!model) {
      throw new EvaluationProviderError("AI_GATEWAY_MODEL is not configured");
    }
    this.name = model;
  }

  async evaluate(context: EvaluationContext): Promise<ProviderOutput> {
    try {
      const response = await this.generate({
        model: this.name,
        system: evaluationSystemInstructions,
        prompt: evaluationTaskPrompt(context),
        maxOutputTokens: 6_000,
        output: Output.object({ schema: providerOutputSchema }),
      });
      return providerOutputSchema.parse(response.output);
    } catch (error) {
      throw new EvaluationProviderError(
        "Vercel AI Gateway evaluation failed closed",
        error,
      );
    }
  }
}
