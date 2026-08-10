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
import { readJob } from "@/server/chain";
import { getDatabase } from "@/server/db";
import { jobDocuments } from "@/server/db/schema";
import { GitHubClient, parseGitHubRepositoryUrl } from "@/server/github";
import { apiError } from "@/server/http";

type RouteContext = { params: Promise<{ chainId: string; jobId: string }> };
const bodySchema = z.object({ pullRequestUrl: z.url().max(500) });

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
    const { job } = await readJob(chainId, jobId);
    if (
      job.status !== 1 ||
      getAddress(job.provider) !== getAddress(session.address)
    ) {
      throw new UnauthorizedError(
        "Only the provider of a funded job can prepare its deliverable.",
      );
    }
    const [document] = await getDatabase()
      .select({ specification: jobDocuments.specification })
      .from(jobDocuments)
      .where(
        and(eq(jobDocuments.chainId, chainId), eq(jobDocuments.jobId, jobId)),
      )
      .limit(1);
    if (!document)
      throw new Error("The immutable job specification is not indexed.");
    const expected = parseGitHubRepositoryUrl(
      document.specification.repositoryUrl,
    );
    const pull = await new GitHubClient().getPullRequest(body.pullRequestUrl);
    if (
      expected.owner.toLowerCase() !== pull.owner.toLowerCase() ||
      expected.repository.toLowerCase() !== pull.repository.toLowerCase()
    ) {
      throw new UnauthorizedError(
        "The pull request is from a different repository.",
      );
    }
    const deliverable = deliverableCommitmentSchema.parse({
      schemaVersion: "1.0.0",
      owner: pull.owner,
      repository: pull.repository,
      pullNumber: pull.pullNumber,
      baseSha: pull.baseSha,
      headSha: pull.headSha,
    });
    return NextResponse.json({
      deliverable,
      deliverableHash: hashCanonicalJson(deliverable),
    });
  } catch (error) {
    return apiError(error);
  }
}
