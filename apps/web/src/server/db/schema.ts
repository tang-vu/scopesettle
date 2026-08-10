import type {
  DeliverableCommitment,
  EvaluationReport,
  JobSpecification,
} from "@scopesettle/shared";
import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const authNonces = pgTable(
  "auth_nonces",
  {
    nonceHash: text("nonce_hash").primaryKey(),
    address: text("address").notNull(),
    domain: text("domain").notNull(),
    chainId: integer("chain_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("auth_nonces_address_idx").on(table.address)],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    address: text("address").notNull(),
    chainId: integer("chain_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("auth_sessions_address_idx").on(table.address)],
);

export const jobDocuments = pgTable(
  "job_documents",
  {
    chainId: integer("chain_id").notNull(),
    jobId: bigint("job_id", { mode: "bigint" }).notNull(),
    client: text("client").notNull(),
    provider: text("provider").notNull(),
    transactionHash: text("transaction_hash").notNull(),
    specificationHash: text("specification_hash").notNull(),
    rubricHash: text("rubric_hash").notNull(),
    specification: jsonb("specification").$type<JobSpecification>().notNull(),
    deliverable: jsonb("deliverable").$type<DeliverableCommitment>(),
    deliverableHash: text("deliverable_hash"),
    submissionTransactionHash: text("submission_transaction_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.chainId, table.jobId] }),
    uniqueIndex("job_documents_tx_hash_unique").on(
      table.chainId,
      table.transactionHash,
    ),
    index("job_documents_client_idx").on(table.client),
    index("job_documents_provider_idx").on(table.provider),
  ],
);

export type SignedVerdictRecord = {
  jobId: string;
  deliverableHash: `0x${string}`;
  reportHash: `0x${string}`;
  score: number;
  confidence: number;
  outcome: number;
  nonce: string;
  deadline: string;
  signature: `0x${string}`;
};

export const evaluationReports = pgTable(
  "evaluation_reports",
  {
    chainId: integer("chain_id").notNull(),
    jobId: bigint("job_id", { mode: "bigint" }).notNull(),
    reportHash: text("report_hash").notNull(),
    report: jsonb("report").$type<EvaluationReport>().notNull(),
    signedVerdict: jsonb("signed_verdict")
      .$type<SignedVerdictRecord>()
      .notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.chainId, table.jobId] }),
    uniqueIndex("evaluation_reports_hash_unique").on(table.reportHash),
  ],
);
