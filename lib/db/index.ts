import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  softmillSql?: ReturnType<typeof postgres>;
  softmillDb?: Database;
};

export function getDb() {
  if (globalForDb.softmillDb) return globalForDb.softmillDb;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const isLocal = /localhost|127\.0\.0\.1/.test(url);
  const sql = postgres(url, {
    max: 1,
    prepare: false,
    ssl: isLocal ? false : "require",
  });

  const db = drizzle(sql, { schema });
  globalForDb.softmillSql = sql;
  globalForDb.softmillDb = db;
  return db;
}
