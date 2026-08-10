import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import nextEnv from "@next/env";
import postgres from "postgres";

const { loadEnvConfig } = nextEnv;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvConfig(root);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to apply migrations.");
}

const migrationsDirectory = join(root, "drizzle");
const files = (await readdir(migrationsDirectory))
  .filter((file) => /^\d+_.+\.sql$/u.test(file))
  .sort();
const client = postgres(databaseUrl, {
  connect_timeout: 8,
  idle_timeout: 10,
  max: 1,
  prepare: false,
});

try {
  await client.begin(async (transaction) => {
    await transaction`SELECT pg_advisory_xact_lock(hashtext('scopesettle-migrations'))`;
    await transaction`
      CREATE TABLE IF NOT EXISTS "_scopesettle_migrations" (
        "filename" text PRIMARY KEY NOT NULL,
        "checksum" text NOT NULL,
        "applied_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `;
    const applied = await transaction`
      SELECT "filename", "checksum" FROM "_scopesettle_migrations"
    `;
    const known = new Map(
      applied.map((migration) => [migration.filename, migration.checksum]),
    );

    for (const filename of files) {
      const source = await readFile(
        join(migrationsDirectory, filename),
        "utf8",
      );
      const checksum = createHash("sha256").update(source).digest("hex");
      const previousChecksum = known.get(filename);
      if (previousChecksum && previousChecksum !== checksum) {
        throw new Error(
          `Applied migration ${filename} was modified; create a new migration instead.`,
        );
      }
      if (previousChecksum) continue;
      await transaction.unsafe(source);
      await transaction`
        INSERT INTO "_scopesettle_migrations" ("filename", "checksum")
        VALUES (${filename}, ${checksum})
      `;
      process.stdout.write(`Applied ${filename}\n`);
    }
  });
} finally {
  await client.end();
}

process.stdout.write(`Database is current (${files.length} migrations).\n`);
