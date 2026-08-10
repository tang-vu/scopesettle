CREATE TABLE IF NOT EXISTS "auth_nonces" (
  "nonce_hash" text PRIMARY KEY NOT NULL,
  "address" text NOT NULL,
  "domain" text NOT NULL,
  "chain_id" integer NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "auth_nonces_address_idx" ON "auth_nonces" ("address");

CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "token_hash" text PRIMARY KEY NOT NULL,
  "address" text NOT NULL,
  "chain_id" integer NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "auth_sessions_address_idx" ON "auth_sessions" ("address");

CREATE TABLE IF NOT EXISTS "job_documents" (
  "chain_id" integer NOT NULL,
  "job_id" bigint NOT NULL,
  "client" text NOT NULL,
  "provider" text NOT NULL,
  "transaction_hash" text NOT NULL,
  "specification_hash" text NOT NULL,
  "rubric_hash" text NOT NULL,
  "specification" jsonb NOT NULL,
  "deliverable" jsonb,
  "deliverable_hash" text,
  "submission_transaction_hash" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "job_documents_chain_id_job_id_pk" PRIMARY KEY("chain_id", "job_id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "job_documents_tx_hash_unique" ON "job_documents" ("chain_id", "transaction_hash");
CREATE INDEX IF NOT EXISTS "job_documents_client_idx" ON "job_documents" ("client");
CREATE INDEX IF NOT EXISTS "job_documents_provider_idx" ON "job_documents" ("provider");

CREATE TABLE IF NOT EXISTS "evaluation_reports" (
  "chain_id" integer NOT NULL,
  "job_id" bigint NOT NULL,
  "report_hash" text NOT NULL,
  "report" jsonb NOT NULL,
  "signed_verdict" jsonb NOT NULL,
  "model" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "evaluation_reports_chain_id_job_id_pk" PRIMARY KEY("chain_id", "job_id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "evaluation_reports_hash_unique" ON "evaluation_reports" ("report_hash");
