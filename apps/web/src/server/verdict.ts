import { randomBytes } from "node:crypto";

import type { EvaluationReport } from "@scopesettle/shared";
import "server-only";

import { privateKeyToAccount } from "viem/accounts";

import { getDeployment, readEvaluatorSigner } from "./chain";
import type { SignedVerdictRecord } from "./db/schema";

const verdictTypes = {
  Verdict: [
    { name: "jobId", type: "uint256" },
    { name: "deliverableHash", type: "bytes32" },
    { name: "reportHash", type: "bytes32" },
    { name: "score", type: "uint16" },
    { name: "confidence", type: "uint16" },
    { name: "outcome", type: "uint8" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint64" },
  ],
} as const;

export async function signEvaluationVerdict(input: {
  chainId: number;
  jobId: bigint;
  deliverableHash: `0x${string}`;
  expiresAt: bigint;
  challengeWindow: bigint;
  report: EvaluationReport;
}): Promise<SignedVerdictRecord> {
  const privateKey = process.env.EVALUATOR_PRIVATE_KEY;
  if (!privateKey || !/^0x[\da-fA-F]{64}$/u.test(privateKey)) {
    throw new Error("The evaluator signer is not configured.");
  }
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const configuredSigner = await readEvaluatorSigner(input.chainId);
  if (account.address.toLowerCase() !== configuredSigner.toLowerCase()) {
    throw new Error("The evaluator key does not match the deployed signer.");
  }
  const deployment = getDeployment(input.chainId);
  const now = Math.floor(Date.now() / 1_000);
  const lastSafeProposal =
    input.report.verdict === "manual_review"
      ? Number(input.expiresAt)
      : Number(input.expiresAt - input.challengeWindow);
  const deadline = BigInt(Math.min(lastSafeProposal, now + 24 * 60 * 60));
  if (deadline <= BigInt(now)) {
    throw new Error(
      "The job no longer has enough time for a valid verdict proposal.",
    );
  }
  const nonce = BigInt(`0x${randomBytes(32).toString("hex")}`);
  const outcome = { pass: 0, fail: 1, manual_review: 2 }[input.report.verdict];
  const message = {
    jobId: input.jobId,
    deliverableHash: input.deliverableHash,
    reportHash: input.report.reportHash as `0x${string}`,
    score: Math.round(input.report.weightedScore * 100),
    confidence: Math.round(input.report.confidence * 100),
    outcome,
    nonce,
    deadline,
  } as const;
  const signature = await account.signTypedData({
    domain: {
      chainId: input.chainId,
      name: "ScopeSettleEvaluator",
      verifyingContract: deployment.evaluator,
      version: "1",
    },
    message,
    primaryType: "Verdict",
    types: verdictTypes,
  });
  return {
    ...message,
    jobId: message.jobId.toString(),
    nonce: message.nonce.toString(),
    deadline: message.deadline.toString(),
    signature,
  };
}
