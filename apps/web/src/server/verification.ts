import { verifyEvaluationReport } from "@scopesettle/shared";
import { and, eq } from "drizzle-orm";
import "server-only";

import { readJob, readVerdictProposal } from "./chain";
import { getDatabase } from "./db";
import { evaluationReports, jobDocuments } from "./db/schema";

export async function createJobVerification(chainId: number, jobId: bigint) {
  const database = getDatabase();
  const [chain, documents, reports, proposal] = await Promise.all([
    readJob(chainId, jobId),
    database
      .select()
      .from(jobDocuments)
      .where(
        and(eq(jobDocuments.chainId, chainId), eq(jobDocuments.jobId, jobId)),
      )
      .limit(1),
    database
      .select()
      .from(evaluationReports)
      .where(
        and(
          eq(evaluationReports.chainId, chainId),
          eq(evaluationReports.jobId, jobId),
        ),
      )
      .limit(1),
    readVerdictProposal(chainId, jobId),
  ]);
  const document = documents[0];
  const saved = reports[0];
  if (!document || !saved) return null;

  return {
    schemaVersion: "1.0.0" as const,
    generatedAt: new Date().toISOString(),
    subject: {
      chainId,
      jobId: jobId.toString(),
      evaluatorContract: chain.job.evaluator,
    },
    verification: verifyEvaluationReport(saved.report, {
      specification: document.specification,
      expectedChainId: chainId,
      expectedJobId: jobId.toString(),
      expectedContractAddress: chain.job.evaluator,
      expectedDeliverableHash: chain.job.deliverable,
      expectedRubricHash: chain.job.policy.rubricHash,
      expectedSpecificationHash: chain.job.policy.specificationHash,
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
