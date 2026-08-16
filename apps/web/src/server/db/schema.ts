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

export type OrganizationRole = "owner" | "member";
export type ApiKeyScope = "jobs:read" | "reports:read" | "webhooks:manage";

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

export const evaluationLeases = pgTable(
  "evaluation_leases",
  {
    chainId: integer("chain_id").notNull(),
    jobId: bigint("job_id", { mode: "bigint" }).notNull(),
    holder: text("holder").notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.chainId, table.jobId] })],
);

export const evaluationRateLimits = pgTable(
  "evaluation_rate_limits",
  {
    address: text("address").notNull(),
    chainId: integer("chain_id").notNull(),
    windowStartedAt: timestamp("window_started_at", {
      withTimezone: true,
    }).notNull(),
    requestCount: integer("request_count").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.address, table.chainId, table.windowStartedAt],
    }),
  ],
);

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("organizations_created_at_idx").on(table.createdAt)],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    address: text("address").notNull(),
    role: text("role").$type<OrganizationRole>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.address] }),
    index("organization_members_address_idx").on(table.address),
  ],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    secretHash: text("secret_hash").notNull(),
    scopes: text("scopes").array().$type<ApiKeyScope[]>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("api_keys_prefix_unique").on(table.prefix),
    index("api_keys_organization_idx").on(table.organizationId),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorType: text("actor_type").$type<"wallet" | "api_key">().notNull(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_events_organization_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
  ],
);
