import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/schema-sqlite.ts",
  out: "./drizzle-sqlite",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/local.db",
  },
});
