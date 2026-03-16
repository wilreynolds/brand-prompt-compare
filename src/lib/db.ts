import dns from "node:dns";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Force IPv4 DNS resolution to avoid ENETUNREACH on IPv6-only addresses
dns.setDefaultResultOrder("ipv4first");

const connectionString = process.env.DATABASE_URL!;

const globalForDb = globalThis as unknown as {
  db: PostgresJsDatabase<typeof schema> | undefined;
  client: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb.client ??
  postgres(connectionString, {
    prepare: false,
    max: 3,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = globalForDb.db ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

export type Database = typeof db;
