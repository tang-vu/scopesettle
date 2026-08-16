CREATE TABLE IF NOT EXISTS "webhook_endpoints" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "event_types" text[] NOT NULL CHECK (
    cardinality("event_types") > 0 AND
    "event_types" <@ ARRAY['job.created', 'deliverable.submitted', 'evaluation.completed']::text[]
  ),
  "chain_id" integer NOT NULL CHECK ("chain_id" > 0),
  "job_id" bigint NOT NULL CHECK ("job_id" >= 0),
  "secret_ciphertext" text NOT NULL,
  "secret_iv" text NOT NULL,
  "secret_tag" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "webhook_endpoints_organization_idx" ON "webhook_endpoints" ("organization_id");
CREATE INDEX IF NOT EXISTS "webhook_endpoints_job_idx" ON "webhook_endpoints" ("chain_id", "job_id");

CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" text PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL CHECK ("event_type" IN ('job.created', 'deliverable.submitted', 'evaluation.completed', 'endpoint.test')),
  "chain_id" integer NOT NULL,
  "job_id" bigint NOT NULL,
  "deduplication_key" text NOT NULL,
  "payload" jsonb NOT NULL,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_dedup_unique"
  ON "webhook_events" ("event_type", "chain_id", "job_id", "deduplication_key");
CREATE INDEX IF NOT EXISTS "webhook_events_pending_idx" ON "webhook_events" ("processed_at", "created_at");

CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" text PRIMARY KEY NOT NULL,
  "endpoint_id" text NOT NULL REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE,
  "event_id" text NOT NULL REFERENCES "webhook_events"("id") ON DELETE CASCADE,
  "status" text NOT NULL CHECK ("status" IN ('pending', 'processing', 'retry', 'delivered', 'dead')),
  "attempt_count" integer DEFAULT 0 NOT NULL CHECK ("attempt_count" >= 0),
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "lease_until" timestamp with time zone,
  "response_status" integer,
  "last_error" text,
  "delivered_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_deliveries_endpoint_event_unique"
  ON "webhook_deliveries" ("endpoint_id", "event_id");
CREATE INDEX IF NOT EXISTS "webhook_deliveries_due_idx"
  ON "webhook_deliveries" ("status", "next_attempt_at");
