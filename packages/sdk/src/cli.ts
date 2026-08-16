import {
  canonicalize,
  evaluationReportSchema,
  jobSpecificationSchema,
} from "@scopesettle/shared";

import { parseCliArguments } from "./cli-options";
import { readBoundedJson } from "./json-input";
import { createScopeSettleVerifier } from "./verifier";

const usage = `ScopeSettle independent verifier

Usage:
  scopesettle --chain-id <id> --rpc-url <url> --commerce <address> \
    --evaluator <address> --job-id <id> --report <file> \
    --specification <file> [--json]

Exit codes:
  0  fully verified
  2  partial verification (public context unavailable)
  1  failed verification or invalid input
`;

async function main() {
  const options = parseCliArguments(process.argv.slice(2));
  if ("help" in options) {
    process.stdout.write(usage);
    return;
  }
  const [report, specification] = await Promise.all([
    readBoundedJson(options.report).then((value) =>
      evaluationReportSchema.parse(value),
    ),
    readBoundedJson(options.specification).then((value) =>
      jobSpecificationSchema.parse(value),
    ),
  ]);
  const verifier = createScopeSettleVerifier({
    chainId: options.chainId,
    commerceAddress: options.commerce,
    evaluatorAddress: options.evaluator,
    rpcUrl: options.rpcUrl,
  });
  const certificate = await verifier.verifyJob({
    jobId: BigInt(options.jobId),
    report,
    specification,
  });

  if (options.json) {
    process.stdout.write(`${canonicalize(certificate)}\n`);
  } else {
    process.stdout.write(
      `ScopeSettle verification: ${certificate.verification.status}\n`,
    );
    for (const item of certificate.verification.checks) {
      process.stdout.write(
        `  [${item.status.toUpperCase()}] ${item.label}: ${item.detail}\n`,
      );
    }
  }
  process.exitCode =
    certificate.verification.status === "verified"
      ? 0
      : certificate.verification.status === "partial"
        ? 2
        : 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown failure";
  process.stderr.write(`ScopeSettle verification failed: ${message}\n`);
  process.exitCode = 1;
});
