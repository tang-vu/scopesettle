import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export class DatabaseUnavailableError extends Error {
  constructor() {
    super(
      "The ScopeSettle index is not configured or is temporarily unavailable.",
    );
    this.name = "DatabaseUnavailableError";
  }
}

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseUnavailableError();
  if (!database) {
    const client = postgres(url, {
      connect_timeout: 8,
      idle_timeout: 20,
      max: 5,
      prepare: false,
      transform: { undefined: null },
    });
    database = drizzle(client, { schema });
  }
  return database;
}
