import { mkdirSync } from "fs";
import os from "os";
import path from "path";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import * as schema from "./schema";
import { SCHEMA_SQL } from "./schema-sql";

type Db = ReturnType<typeof drizzlePg<typeof schema>>;

const globalForDb = globalThis as unknown as {
  db?: Db;
  ready?: Promise<Db>;
};

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

function isPglite(url: string) {
  return url.startsWith("pglite:") || url.startsWith("file:");
}

function pgliteDataDir(url: string) {
  const configured = url
    .replace(/^pglite:\/\//, "")
    .replace(/^pglite:/, "")
    .replace(/^file:\/\//, "");

  // Brackets in Windows paths (e.g. C:\[EDEN]\...) break some mkdir implementations.
  const cwd = process.cwd();
  if (/[\[\]]/.test(cwd)) {
    return path.join(os.tmpdir(), "uplifted-pglite");
  }

  const resolved = path.isAbsolute(configured)
    ? configured
    : path.join(cwd, configured);
  mkdirSync(resolved, { recursive: true });
  return resolved;
}

async function createDb(): Promise<Db> {
  const url = databaseUrl();

  if (isPglite(url)) {
    const { PGlite } = await import("@electric-sql/pglite");
    const dataDir = pgliteDataDir(url);
    mkdirSync(dataDir, { recursive: true });
    const client = new PGlite(dataDir);
    await client.waitReady;
    await client.exec(SCHEMA_SQL);
    return drizzlePglite(client, { schema }) as unknown as Db;
  }

  const needsSsl =
    url.includes("sslmode=require") ||
    url.includes("neon.tech") ||
    url.includes("supabase.co");

  const sql = postgres(url, {
    max: 10,
    ssl: needsSsl ? "require" : false,
  });
  await sql.unsafe(SCHEMA_SQL);
  return drizzlePg(sql, { schema });
}

export async function getDb() {
  if (globalForDb.db) return globalForDb.db;
  if (!globalForDb.ready) {
    globalForDb.ready = createDb()
      .then((db) => {
        globalForDb.db = db;
        return db;
      })
      .catch((error) => {
        globalForDb.ready = undefined;
        throw error;
      });
  }
  return globalForDb.ready;
}
