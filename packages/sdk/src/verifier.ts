import {
  agenticCommerceAbi,
  scopeSettleEvaluatorAbi,
  supportedChains,
  verifyEvaluationReport,
  type EvaluationReport,
  type JobSpecification,
  type ReportVerification,
} from "@scopesettle/shared";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  getAddress,
  http,
  isAddress,
  type Address,
  type PublicClient,
} from "viem";
import { z } from "zod";

const verifierConfigurationSchema = z.object({
  chainId: z.number().int().positive(),
  rpcUrl: z.url().max(2_000),
  commerceAddress: z.string().refine(isAddress, "Invalid commerce address"),
  evaluatorAddress: z.string().refine(isAddress, "Invalid evaluator address"),
});

export type VerifierConfiguration = z.input<typeof verifierConfigurationSchema>;

export type VerificationCertificate = {
  schemaVersion: "1.0.0";
  generatedAt: string;
  subject: {
    chainId: number;
    jobId: string;
    commerceContract: Address;
    evaluatorContract: Address;
  };
  verification: ReportVerification;
};

type ContractReader = Pick<PublicClient, "readContract">;

async function readProposal(
  client: ContractReader,
  evaluatorAddress: Address,
  jobId: bigint,
) {
  try {
    return await client.readContract({
      abi: scopeSettleEvaluatorAbi,
      address: evaluatorAddress,
      args: [jobId],
      functionName: "getProposal",
    });
  } catch (error) {
    if (error instanceof BaseError) {
      const reverted = error.walk(
        (cause) => cause instanceof ContractFunctionRevertedError,
      );
      if (
        reverted instanceof ContractFunctionRevertedError &&
        reverted.data?.errorName === "ProposalMissing"
      ) {
        return null;
      }
    }
    throw error;
  }
}

export async function verifyJobWithReader(input: {
  chainId: number;
  commerceAddress: Address;
  evaluatorAddress: Address;
  jobId: bigint;
  report: EvaluationReport;
  specification: JobSpecification;
  reader: ContractReader;
  clock?: () => Date;
}): Promise<VerificationCertificate> {
  const [job, proposal] = await Promise.all([
    input.reader.readContract({
      abi: agenticCommerceAbi,
      address: input.commerceAddress,
      args: [input.jobId],
      functionName: "getJob",
    }),
    readProposal(input.reader, input.evaluatorAddress, input.jobId),
  ]);

  return {
    schemaVersion: "1.0.0",
    generatedAt: (input.clock ?? (() => new Date()))().toISOString(),
    subject: {
      chainId: input.chainId,
      jobId: input.jobId.toString(),
      commerceContract: input.commerceAddress,
      evaluatorContract: input.evaluatorAddress,
    },
    verification: verifyEvaluationReport(input.report, {
      specification: input.specification,
      expectedChainId: input.chainId,
      expectedJobId: input.jobId.toString(),
      expectedContractAddress: input.commerceAddress,
      expectedEvaluatorAddress: job.evaluator,
      proposalContractAddress: input.evaluatorAddress,
      expectedDeliverableHash: job.deliverable,
      expectedRubricHash: job.policy.rubricHash,
      expectedSpecificationHash: job.policy.specificationHash,
      proposal: proposal
        ? {
            confidence: proposal.confidence,
            deliverableHash: proposal.deliverableHash,
            outcome: proposal.outcome,
            reportHash: proposal.reportHash,
            score: proposal.score,
          }
        : null,
    }),
  };
}

export function createScopeSettleVerifier(
  configuration: VerifierConfiguration,
) {
  const parsed = verifierConfigurationSchema.parse(configuration);
  const chain = supportedChains.find(
    (candidate) => candidate.id === parsed.chainId,
  );
  if (!chain) {
    throw new RangeError(`Unsupported ScopeSettle chain ID ${parsed.chainId}.`);
  }
  const commerceAddress = getAddress(parsed.commerceAddress);
  const evaluatorAddress = getAddress(parsed.evaluatorAddress);
  const client = createPublicClient({
    chain,
    transport: http(parsed.rpcUrl, { retryCount: 2, timeout: 10_000 }),
  });

  return {
    verifyJob(input: {
      jobId: bigint;
      report: EvaluationReport;
      specification: JobSpecification;
    }) {
      return verifyJobWithReader({
        chainId: parsed.chainId,
        commerceAddress,
        evaluatorAddress,
        jobId: input.jobId,
        reader: client,
        report: input.report,
        specification: input.specification,
      });
    },
  };
}
