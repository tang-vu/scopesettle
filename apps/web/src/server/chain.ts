import {
  agenticCommerceAbi,
  scopeSettleEvaluatorAbi,
  supportedChains,
} from "@scopesettle/shared";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  getAddress,
  http,
  isAddress,
  parseEventLogs,
  type Address,
  type Hash,
} from "viem";

export type Deployment = {
  chainId: number;
  commerce: Address;
  evaluator: Address;
  paymentToken: Address;
};

export class DeploymentUnavailableError extends Error {
  constructor() {
    super("ScopeSettle contracts are not configured for this network.");
    this.name = "DeploymentUnavailableError";
  }
}

export function getDeployment(chainId: number): Deployment {
  const configuredChain = Number(
    process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || 1952,
  );
  const commerce = process.env.NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS;
  const evaluator = process.env.NEXT_PUBLIC_SCOPESETTLE_EVALUATOR_ADDRESS;
  const paymentToken = process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS;
  if (
    chainId !== configuredChain ||
    !commerce ||
    !evaluator ||
    !paymentToken ||
    !isAddress(commerce) ||
    !isAddress(evaluator) ||
    !isAddress(paymentToken)
  ) {
    throw new DeploymentUnavailableError();
  }
  return {
    chainId,
    commerce: getAddress(commerce),
    evaluator: getAddress(evaluator),
    paymentToken: getAddress(paymentToken),
  };
}

export function getScopeSettleClient(chainId: number) {
  const chain = supportedChains.find((candidate) => candidate.id === chainId);
  if (!chain) throw new DeploymentUnavailableError();
  return createPublicClient({
    chain,
    transport: http(chain.rpcUrls.default.http[0], {
      retryCount: 2,
      timeout: 8_000,
    }),
  });
}

export async function readJob(chainId: number, jobId: bigint) {
  const deployment = getDeployment(chainId);
  const client = getScopeSettleClient(chainId);
  const job = await client.readContract({
    abi: agenticCommerceAbi,
    address: deployment.commerce,
    args: [jobId],
    functionName: "getJob",
  });
  return { client, deployment, job };
}

export async function assertSuccessfulTransaction(
  chainId: number,
  hash: Hash,
  expectedSender: Address,
  operation: {
    eventName: "JobCreated" | "JobSubmitted";
    jobId: bigint;
  },
): Promise<void> {
  const { commerce } = getDeployment(chainId);
  const receipt = await getScopeSettleClient(chainId).getTransactionReceipt({
    hash,
  });
  if (
    receipt.status !== "success" ||
    receipt.to?.toLowerCase() !== commerce.toLowerCase() ||
    receipt.from.toLowerCase() !== expectedSender.toLowerCase()
  ) {
    throw new Error(
      "The supplied transaction does not match this job operation.",
    );
  }
  const matchingEvent = parseEventLogs({
    abi: agenticCommerceAbi,
    eventName: operation.eventName,
    logs: receipt.logs,
    strict: true,
  }).some((event) => event.args.jobId === operation.jobId);
  if (!matchingEvent) {
    throw new Error(
      `The supplied transaction did not emit ${operation.eventName} for this job.`,
    );
  }
}

export async function readEvaluatorSigner(chainId: number): Promise<Address> {
  const deployment = getDeployment(chainId);
  return getScopeSettleClient(chainId).readContract({
    abi: scopeSettleEvaluatorAbi,
    address: deployment.evaluator,
    functionName: "verdictSigner",
  });
}

export async function verdictProposalExists(
  chainId: number,
  jobId: bigint,
): Promise<boolean> {
  const deployment = getDeployment(chainId);
  try {
    await getScopeSettleClient(chainId).readContract({
      abi: scopeSettleEvaluatorAbi,
      address: deployment.evaluator,
      args: [jobId],
      functionName: "getProposal",
    });
    return true;
  } catch (error) {
    if (error instanceof BaseError) {
      const reverted = error.walk(
        (cause) => cause instanceof ContractFunctionRevertedError,
      );
      if (
        reverted instanceof ContractFunctionRevertedError &&
        reverted.data?.errorName === "ProposalMissing"
      ) {
        return false;
      }
    }
    throw error;
  }
}
