import { z } from "zod";

const hex32Schema = z
  .string()
  .regex(/^0x[\da-f]{64}$/u, "Expected a lowercase bytes32 value");
const addressSchema = z
  .string()
  .regex(/^0x[\da-fA-F]{40}$/u, "Expected an EVM address");
const commitShaSchema = z
  .string()
  .regex(/^[\da-f]{40}$/u, "Expected a full lowercase Git SHA");

export const criterionSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/u),
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(2_000),
  weight: z.number().int().min(1).max(100),
  requiredFiles: z.array(z.string().min(1).max(260)).max(20).default([]),
  requiresPassingCi: z.boolean().default(false),
});

export const jobSpecificationSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    title: z.string().min(3).max(140),
    scope: z.string().min(20).max(10_000),
    repositoryUrl: z.url().max(300),
    issueUrl: z.url().max(300).optional(),
    provider: addressSchema,
    budget: z.string().regex(/^\d+$/u, "Budget must be base-unit digits"),
    expiresAt: z.iso.datetime({ offset: true }),
    minimumPassingScore: z.number().int().min(0).max(100),
    minimumConfidence: z.number().int().min(0).max(100),
    challengeWindowSeconds: z
      .number()
      .int()
      .min(1)
      .max(30 * 24 * 60 * 60),
    criteria: z.array(criterionSchema).min(1).max(12),
  })
  .superRefine((value, context) => {
    const total = value.criteria.reduce(
      (sum, criterion) => sum + criterion.weight,
      0,
    );
    if (total !== 100) {
      context.addIssue({
        code: "custom",
        message: `Criterion weights must sum to 100 (received ${total})`,
        path: ["criteria"],
      });
    }
  });

export const githubRepositorySchema = z.object({
  owner: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  pullNumber: z.number().int().positive(),
  baseSha: commitShaSchema,
  headSha: commitShaSchema,
});

export const deterministicCheckSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(180),
  status: z.enum(["pass", "fail", "warning", "unavailable"]),
  evidence: z.string().max(2_000).optional(),
});

export const evaluationEvidenceSchema = z.object({
  file: z.string().max(260).optional(),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
  excerpt: z.string().max(800).optional(),
  url: z.url().max(1_000).optional(),
});

export const evaluationCriterionSchema = z
  .object({
    id: z.string().min(1).max(64),
    title: z.string().min(1).max(160),
    weight: z.number().int().min(1).max(100),
    score: z.number().min(0).max(100),
    status: z.enum(["pass", "partial", "fail", "unverifiable"]),
    reason: z.string().min(1).max(2_000),
    evidence: z.array(evaluationEvidenceSchema).max(20),
  })
  .superRefine((criterion, context) => {
    if (
      criterion.status !== "unverifiable" &&
      criterion.evidence.length === 0
    ) {
      context.addIssue({
        code: "custom",
        message: "Every scored criterion requires evidence",
        path: ["evidence"],
      });
    }
  });

export const evaluationReportContentSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  promptVersion: z.string().min(1).max(32),
  model: z.string().min(1).max(120),
  generatedAt: z.iso.datetime({ offset: true }),
  jobId: z.string().regex(/^\d+$/u),
  chainId: z.number().int().positive(),
  contractAddress: addressSchema,
  repository: githubRepositorySchema,
  deterministicChecks: z.array(deterministicCheckSchema).min(1).max(50),
  criteria: z.array(evaluationCriterionSchema).min(1).max(12),
  weightedScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  verdict: z.enum(["pass", "fail", "manual_review"]),
  limitations: z.array(z.string().min(1).max(500)).min(1).max(20),
});

export const evaluationReportSchema = evaluationReportContentSchema.extend({
  reportHash: hex32Schema,
});

export const deliverableCommitmentSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  owner: z.string().min(1).max(100),
  repository: z.string().min(1).max(100),
  pullNumber: z.number().int().positive(),
  baseSha: commitShaSchema,
  headSha: commitShaSchema,
});

export type JobSpecification = z.infer<typeof jobSpecificationSchema>;
export type EvaluationReportContent = z.infer<
  typeof evaluationReportContentSchema
>;
export type EvaluationReport = z.infer<typeof evaluationReportSchema>;
export type DeliverableCommitment = z.infer<typeof deliverableCommitmentSchema>;
