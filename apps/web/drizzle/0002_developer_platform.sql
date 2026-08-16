CREATE TABLE IF NOT EXISTS "organizations" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "organizations_created_at_idx" ON "organizations" ("created_at");

CREATE TABLE IF NOT EXISTS "organization_members" (
  "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "address" text NOT NULL,
  "role" text NOT NULL CHECK ("role" IN ('owner', 'member')),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "organization_members_organization_id_address_pk" PRIMARY KEY("organization_id", "address")
);
CREATE INDEX IF NOT EXISTS "organization_members_address_idx" ON "organization_members" ("address");

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "prefix" text NOT NULL,
  "secret_hash" text NOT NULL,
  "scopes" text[] NOT NULL CHECK (
    cardinality("scopes") > 0 AND
    "scopes" <@ ARRAY['jobs:read', 'reports:read', 'webhooks:manage']::text[]
  ),
  "expires_at" timestamp with time zone,
  "last_used_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_prefix_unique" ON "api_keys" ("prefix");
CREATE INDEX IF NOT EXISTS "api_keys_organization_idx" ON "api_keys" ("organization_id");

CREATE TABLE IF NOT EXISTS "audit_events" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "actor_type" text NOT NULL CHECK ("actor_type" IN ('wallet', 'api_key')),
  "actor_id" text NOT NULL,
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "audit_events_organization_created_idx"
  ON "audit_events" ("organization_id", "created_at");
