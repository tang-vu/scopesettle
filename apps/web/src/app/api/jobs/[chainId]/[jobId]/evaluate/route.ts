import {
  evaluationReportSchema,
  hashCanonicalJson,
  type EvaluationReport,
} from "@scopesettle/shared";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAddress } from "viem";
import { z } from "zod";

import { requireWalletSession, UnauthorizedError } from "@/server/auth";
import { readJob } from "@/server/chain";
import { getDatabase } from "@/server/db";
import { serializeJobRecord } from "@/server/db/json-record";
import { evaluationReports, jobDocuments } from "@/server/db/schema";
import {
  acquireEvaluationLease,
  releaseEvaluationLease,
} from "@/server/evaluation-guard";
import { OpenAIEvaluationProvider } from "@/server/evaluator/openai-provider";
import { VercelGatewayEvaluationProvider } from "@/server/evaluator/vercel-gateway-provider";
import { evaluatePullRequest } from "@/server/evaluator/pipeline";
import { GitHubClient } from "@/server/github";
import { apiError } from "@/server/http";
import { signEvaluationVerdict } from "@/server/verdict";

type RouteContext = { params: Promise<{ chainId: string; jobId: string }> };

function forceManualReview(
  report: EvaluationReport,
  reason: string,
): EvaluationReport {
  const { reportHash, ...content } = report;
  void reportHash;
  const revised = {
    ...content,
    verdict: "manual_review" as const,
    limitations: [...content.limitations, reason],
  };
  return evaluationReportSchema.parse({
    ...revised,
    reportHash: hashCanonicalJson(revised),
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireWalletSession(request);
    const parameters = await context.params;
    const chainId = z.coerce
      .number()
      .int()
      .positive()
      .parse(parameters.chainId);
    const jobId = BigInt(z.string().regex(/^\d+$/u).parse(parameters.jobId));
    if (session.chainId !== chainId)
      throw new UnauthorizedError("Session chain mismatch.");
    const database = getDatabase();
    const [existing] = await database
      .select()
      .from(evaluationReports)
      .where(
        and(
          eq(evaluationReports.chainId, chainId),
          eq(evaluationReports.jobId, jobId),
        ),
      )
      .limit(1);
    const [document] = await database
      .select()
      .from(jobDocuments)
      .where(
        and(eq(jobDocuments.chainId, chainId), eq(jobDocuments.jobId, jobId)),
      )
      .limit(1);
    if (!document?.deliverable || !document.deliverableHash) {
      throw new Error(
        "The pinned deliverable is not available for evaluation.",
      );
    }
    const { deployment, job } = await readJob(chainId, jobId);
    if (
      job.status !== 2 ||
      job.deliverable !== document.deliverableHash ||
      ![job.client, job.provider].some(
        (address) => getAddress(address) === getAddress(session.address),
      )
    ) {
      throw new UnauthorizedError(
        "This wallet cannot evaluate the submitted job.",
      );
    }
    const now = Math.floor(Date.now() / 1_000);
    if (Number(job.expiredAt) <= now) {
      const expired = new Error(
        "The job has expired; claim the onchain refund instead.",
      );
      expired.name = "ConflictError";
      throw expired;
    }
    if (existing) {
      if (Number(existing.signedVerdict.deadline) > now) {
        return NextResponse.json(serializeJobRecord(existing));
      }
      const signedVerdict = await signEvaluationVerdict({
        chainId,
        challengeWindow: BigInt(job.policy.challengeWindow),
        deliverableHash: document.deliverableHash as `0x${string}`,
        expiresAt: job.expiredAt,
        jobId,
        report: existing.report,
      });
      await database
        .update(evaluationReports)
        .set({ signedVerdict })
        .where(
          and(
            eq(evaluationReports.chainId, chainId),
            eq(evaluationReports.jobId, jobId),
          ),
        );
      return NextResponse.json(
        serializeJobRecord({ ...existing, signedVerdict }),
      );
    }
    const lease = await acquireEvaluationLease({
      address: session.address,
      chainId,
      jobId,
    });
    try {
      const deliverable = document.deliverable;
      const pull = await new GitHubClient().getPullRequest(
        `https://github.com/${deliverable.owner}/${deliverable.repository}/pull/${deliverable.pullNumber}`,
      );
      let report = await evaluatePullRequest(
        {
          chainId,
          contractAddress: deployment.commerce,
          expectedHeadSha: deliverable.headSha,
          jobId: jobId.toString(),
          pull,
          specification: document.specification,
        },
        process.env.OPENAI_API_KEY
          ? new OpenAIEvaluationProvider()
          : new VercelGatewayEvaluationProvider(),
      );
      if (
        report.verdict !== "manual_review" &&
        now + Number(job.policy.challengeWindow) >= Number(job.expiredAt)
      ) {
        report = forceManualReview(
          report,
          "Automatic settlement was disabled because the remaining job lifetime cannot contain the immutable challenge window.",
        );
      }
      const signedVerdict = await signEvaluationVerdict({
        chainId,
        challengeWindow: BigInt(job.policy.challengeWindow),
        deliverableHash: document.deliverableHash as `0x${string}`,
        expiresAt: job.expiredAt,
        jobId,
        report,
      });
      await database
        .insert(evaluationReports)
        .values({
          chainId,
          jobId,
          model: report.model,
          report,
          reportHash: report.reportHash,
          signedVerdict,
        })
        .onConflictDoNothing();
      const [saved] = await database
        .select()
        .from(evaluationReports)
        .where(
          and(
            eq(evaluationReports.chainId, chainId),
            eq(evaluationReports.jobId, jobId),
          ),
        )
        .limit(1);
      if (!saved)
        throw new Error("The evaluation report could not be persisted.");
      return NextResponse.json(serializeJobRecord(saved), { status: 201 });
    } finally {
      await releaseEvaluationLease(lease).catch((error: unknown) => {
        console.error("ScopeSettle evaluation lease release failed", {
          name: error instanceof Error ? error.name : "UnknownError",
        });
      });
    }
  } catch (error) {
    return apiError(error);
  }
}
