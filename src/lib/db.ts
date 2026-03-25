import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require("better-sqlite3");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "local.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

const globalForDb = globalThis as unknown as {
  db: BetterSQLite3Database<typeof schema> | undefined;
};

function getDb(): BetterSQLite3Database<typeof schema> {
  if (globalForDb.db) return globalForDb.db;
  const instance = drizzle(sqlite, { schema });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.db = instance;
  }
  return instance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = getDb();

// Re-export schema tables
export const { brands, models, prompts, runs, runBrands, responses, parsedComparisons, sources, conceptScores } = schema;

/** Returns a timestamp value compatible with SQLite. */
export function now(): string {
  return new Date().toISOString();
}
