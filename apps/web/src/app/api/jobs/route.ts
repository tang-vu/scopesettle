import {
  erc20Abi,
  hashCanonicalJson,
  jobSpecificationSchema,
} from "@scopesettle/shared";
import { and, desc, eq, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAddress } from "viem";
import { z } from "zod";

import { requireWalletSession, UnauthorizedError } from "@/server/auth";
import {
  assertSuccessfulTransaction,
  getDeployment,
  getScopeSettleClient,
  readJob,
} from "@/server/chain";
import { getDatabase } from "@/server/db";
import { evaluationReports, jobDocuments } from "@/server/db/schema";
import { apiError } from "@/server/http";

const bodySchema = z.object({
  chainId: z.number().int().positive(),
  jobId: z.string().regex(/^\d+$/u),
  transactionHash: z.string().regex(/^0x[\da-fA-F]{64}$/u),
  specification: jobSpecificationSchema,
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireWalletSession(request);
    const body = bodySchema.parse(await request.json());
    if (session.chainId !== body.chainId)
      throw new UnauthorizedError("Session chain mismatch.");
    const jobId = BigInt(body.jobId);
    const { deployment, job } = await readJob(body.chainId, jobId);
    const specificationHash = hashCanonicalJson(body.specification);
    const rubricHash = hashCanonicalJson(body.specification.criteria);
    if (
      getAddress(job.client) !== getAddress(session.address) ||
      getAddress(job.provider) !== getAddress(body.specification.provider) ||
      getAddress(job.evaluator) !== deployment.evaluator ||
      job.policy.specificationHash !== specificationHash ||
      job.policy.rubricHash !== rubricHash ||
      job.policy.minimumScore !==
        body.specification.minimumPassingScore * 100 ||
      job.policy.minimumConfidence !==
        body.specification.minimumConfidence * 100 ||
      job.policy.challengeWindow !== body.specification.challengeWindowSeconds
    ) {
      throw new UnauthorizedError(
        "The saved specification does not match the onchain job.",
      );
    }
    await assertSuccessfulTransaction(
      body.chainId,
      body.transactionHash as `0x${string}`,
      session.address,
    );
    const database = getDatabase();
    await database
      .insert(jobDocuments)
      .values({
        chainId: body.chainId,
        jobId,
        client: session.address.toLowerCase(),
        provider: body.specification.provider.toLowerCase(),
        transactionHash: body.transactionHash.toLowerCase(),
        specificationHash,
        rubricHash,
        specification: body.specification,
      })
      .onConflictDoNothing();
    const [saved] = await database
      .select({ specificationHash: jobDocuments.specificationHash })
      .from(jobDocuments)
      .where(
        and(
          eq(jobDocuments.chainId, body.chainId),
          eq(jobDocuments.jobId, jobId),
        ),
      )
      .limit(1);
    if (!saved || saved.specificationHash !== specificationHash) {
      const conflict = new Error(
        "A different specification is already stored for this job.",
      );
      conflict.name = "ConflictError";
      throw conflict;
    }
    return NextResponse.json(
      { jobId: body.jobId, specificationHash, rubricHash },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const chainId = z.coerce
      .number()
      .int()
      .positive()
      .parse(request.nextUrl.searchParams.get("chainId") ?? "1952");
    const addressInput = request.nextUrl.searchParams.get("address");
    const address = addressInput
      ? getAddress(addressInput).toLowerCase()
      : null;
    const database = getDatabase();
    const deployment = getDeployment(chainId);
    const publicClient = getScopeSettleClient(chainId);
    const [symbol, decimals] = await Promise.all([
      publicClient.readContract({
        abi: erc20Abi,
        address: deployment.paymentToken,
        functionName: "symbol",
      }),
      publicClient.readContract({
        abi: erc20Abi,
        address: deployment.paymentToken,
        functionName: "decimals",
      }),
    ]);
    const documents = await database
      .select()
      .from(jobDocuments)
      .where(
        address
          ? and(
              eq(jobDocuments.chainId, chainId),
              or(
                eq(jobDocuments.client, address),
                eq(jobDocuments.provider, address),
              ),
            )
          : eq(jobDocuments.chainId, chainId),
      )
      .orderBy(desc(jobDocuments.createdAt))
      .limit(20);
    const jobs = await Promise.all(
      documents.map(async (document) => {
        const [{ job }, report] = await Promise.all([
          readJob(chainId, document.jobId),
          database
            .select({ report: evaluationReports.report })
            .from(evaluationReports)
            .where(
              and(
                eq(evaluationReports.chainId, chainId),
                eq(evaluationReports.jobId, document.jobId),
              ),
            )
            .limit(1),
        ]);
        return {
          budget: job.budget.toString(),
          chainId,
          client: job.client,
          expiresAt: job.expiredAt.toString(),
          jobId: document.jobId.toString(),
          provider: job.provider,
          score: report[0]?.report.weightedScore ?? null,
          status: job.status,
          title: document.specification.title,
          transactionHash: document.transactionHash,
        };
      }),
    );
    return NextResponse.json({ jobs, token: { decimals, symbol } });
  } catch (error) {
    return apiError(error);
  }
}
