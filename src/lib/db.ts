import { drizzle as drizzlePg, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzleSqlite, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as pgSchema from "./schema";
import * as sqliteSchema from "./schema-sqlite";

const usePostgres = !!process.env.DATABASE_URL;

// --- Postgres setup ---
function createPgDb() {
  // Dynamic import to avoid loading postgres when using sqlite
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const postgres = require("postgres");
  const client = postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: 3,
    idle_timeout: 20,
  });
  return drizzlePg(client, { schema: pgSchema });
}

// --- SQLite setup ---
function createSqliteDb() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");
  const fs = require("fs");
  const path = require("path");

  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "local.db");
  const sqlite = new Database(dbPath);

  // Enable WAL mode for better concurrent performance
  sqlite.pragma("journal_mode = WAL");

  return drizzleSqlite(sqlite, { schema: sqliteSchema });
}

// --- Global singleton ---
type DbInstance = PostgresJsDatabase<typeof pgSchema> | BetterSQLite3Database<typeof sqliteSchema>;

const globalForDb = globalThis as unknown as {
  db: DbInstance | undefined;
};

function getDb(): DbInstance {
  if (globalForDb.db) return globalForDb.db;

  const instance = usePostgres ? createPgDb() : createSqliteDb();

  if (process.env.NODE_ENV !== "production") {
    globalForDb.db = instance;
  }

  return instance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = getDb();

// Re-export the active schema's tables so routes import from one place.
// We use the Postgres types as the canonical type since both schemas have
// identical shapes at runtime. The `as` casts are safe because only one
// dialect is ever loaded.
const s = usePostgres ? pgSchema : sqliteSchema;

export const brands = s.brands as unknown as typeof pgSchema.brands;
export const models = s.models as unknown as typeof pgSchema.models;
export const prompts = s.prompts as unknown as typeof pgSchema.prompts;
export const runs = s.runs as unknown as typeof pgSchema.runs;
export const runBrands = s.runBrands as unknown as typeof pgSchema.runBrands;
export const responses = s.responses as unknown as typeof pgSchema.responses;
export const parsedComparisons = s.parsedComparisons as unknown as typeof pgSchema.parsedComparisons;
export const sources = s.sources as unknown as typeof pgSchema.sources;
export const conceptScores = s.conceptScores as unknown as typeof pgSchema.conceptScores;

export const isPostgres = usePostgres;
