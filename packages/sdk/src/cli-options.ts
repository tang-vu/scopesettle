import { z } from "zod";

const optionsSchema = z.object({
  chainId: z.coerce.number().int().positive(),
  commerce: z.string().min(1),
  evaluator: z.string().min(1),
  jobId: z.string().regex(/^\d+$/u, "Job ID must contain only digits"),
  report: z.string().min(1),
  rpcUrl: z.url().max(2_000),
  specification: z.string().min(1),
  json: z.boolean(),
});

export type CliOptions = z.infer<typeof optionsSchema>;

const valueFlags: Readonly<Record<string, string>> = {
  "--chain-id": "chainId",
  "--commerce": "commerce",
  "--evaluator": "evaluator",
  "--job-id": "jobId",
  "--report": "report",
  "--rpc-url": "rpcUrl",
  "--specification": "specification",
};

export function parseCliArguments(
  arguments_: readonly string[],
): CliOptions | { help: true } {
  if (arguments_.includes("--help") || arguments_.includes("-h")) {
    return { help: true };
  }
  const values: Record<string, unknown> = { json: false };
  for (let index = 0; index < arguments_.length; index += 1) {
    const flag = arguments_[index];
    if (flag === "--json") {
      values.json = true;
      continue;
    }
    const property = flag ? valueFlags[flag] : null;
    if (!property) throw new Error(`Unknown CLI option: ${flag ?? ""}`);
    const value = arguments_[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag}.`);
    }
    if (values[property] !== undefined) {
      throw new Error(`Duplicate CLI option: ${flag}.`);
    }
    values[property] = value;
    index += 1;
  }
  return optionsSchema.parse(values);
}
