import {
  deliverableCommitmentSchema,
  hashCanonicalJson,
} from "@scopesettle/shared";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAddress } from "viem";
import { z } from "zod";

import { requireWalletSession, UnauthorizedError } from "@/server/auth";
import { assertSuccessfulTransaction, readJob } from "@/server/chain";
import { getDatabase } from "@/server/db";
import { jobDocuments } from "@/server/db/schema";
import { GitHubClient, parseGitHubRepositoryUrl } from "@/server/github";
import { apiError } from "@/server/http";

type RouteContext = { params: Promise<{ chainId: string; jobId: string }> };
const bodySchema = z.object({
  deliverable: deliverableCommitmentSchema,
  transactionHash: z.string().regex(/^0x[\da-fA-F]{64}$/u),
});

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
    const body = bodySchema.parse(await request.json());
    if (session.chainId !== chainId)
      throw new UnauthorizedError("Session chain mismatch.");
    const deliverableHash = hashCanonicalJson(body.deliverable);
    const { job } = await readJob(chainId, jobId);
    if (
      job.status !== 2 ||
      getAddress(job.provider) !== getAddress(session.address) ||
      job.deliverable !== deliverableHash
    ) {
      throw new UnauthorizedError(
        "The submitted deliverable does not match the onchain job.",
      );
    }
    await assertSuccessfulTransaction(
      chainId,
      body.transactionHash as `0x${string}`,
      session.address,
    );
    const database = getDatabase();
    const [document] = await database
      .select({ specification: jobDocuments.specification })
      .from(jobDocuments)
      .where(
        and(eq(jobDocuments.chainId, chainId), eq(jobDocuments.jobId, jobId)),
      )
      .limit(1);
    if (!document)
      throw new Error("The immutable job specification is not indexed.");
    const repository = parseGitHubRepositoryUrl(
      document.specification.repositoryUrl,
    );
    if (
      repository.owner.toLowerCase() !== body.deliverable.owner.toLowerCase() ||
      repository.repository.toLowerCase() !==
        body.deliverable.repository.toLowerCase()
    ) {
      throw new UnauthorizedError(
        "The deliverable repository does not match the specification.",
      );
    }
    const pull = await new GitHubClient().getPullRequest(
      `https://github.com/${body.deliverable.owner}/${body.deliverable.repository}/pull/${body.deliverable.pullNumber}`,
    );
    if (
      pull.headSha !== body.deliverable.headSha ||
      pull.baseSha !== body.deliverable.baseSha
    ) {
      throw new UnauthorizedError(
        "The pull request changed before its commitment was indexed.",
      );
    }
    await database
      .update(jobDocuments)
      .set({
        deliverable: body.deliverable,
        deliverableHash,
        submissionTransactionHash: body.transactionHash.toLowerCase(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(jobDocuments.chainId, chainId), eq(jobDocuments.jobId, jobId)),
      );
    return NextResponse.json({ deliverableHash });
  } catch (error) {
    return apiError(error);
  }
}
