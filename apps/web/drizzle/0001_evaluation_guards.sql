CREATE TABLE IF NOT EXISTS "evaluation_leases" (
  "chain_id" integer NOT NULL,
  "job_id" bigint NOT NULL,
  "holder" text NOT NULL,
  "acquired_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "evaluation_leases_chain_id_job_id_pk" PRIMARY KEY("chain_id", "job_id")
);

CREATE TABLE IF NOT EXISTS "evaluation_rate_limits" (
  "address" text NOT NULL,
  "chain_id" integer NOT NULL,
  "window_started_at" timestamp with time zone NOT NULL,
  "request_count" integer NOT NULL,
  CONSTRAINT "evaluation_rate_limits_address_chain_id_window_pk"
    PRIMARY KEY("address", "chain_id", "window_started_at")
);
