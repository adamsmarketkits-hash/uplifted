import { mkdirSync } from "fs";
import os from "os";
import path from "path";
import { asc, eq, inArray } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { CANONICAL_INVITE_CODE } from "../invite";
import * as schema from "./schema";
import { families, members, routines, workouts } from "./schema";
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

async function ensureCanonicalFamily(db: Db) {
  const rows = await db.select().from(families).orderBy(asc(families.createdAt));
  if (!rows.length) return;

  let target = rows.find((row) => row.inviteCode === CANONICAL_INVITE_CODE);
  if (!target) {
    target = rows[0];
    await db
      .update(families)
      .set({ inviteCode: CANONICAL_INVITE_CODE })
      .where(eq(families.id, target.id));
  }

  const otherIds = rows.filter((row) => row.id !== target.id).map((row) => row.id);
  if (!otherIds.length) return;

  await db
    .update(members)
    .set({ familyId: target.id })
    .where(inArray(members.familyId, otherIds));
  await db.delete(families).where(inArray(families.id, otherIds));
}

async function mergeDuplicateMembers(db: Db) {
  const rows = await db.select().from(members).orderBy(asc(members.createdAt));
  const groups = new Map<string, typeof rows>();
  for (const member of rows) {
    const key = `${member.familyId}:${member.displayName.trim().toLowerCase()}`;
    const group = groups.get(key) ?? [];
    group.push(member);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const [keep, ...duplicates] = group;
    const duplicateIds = duplicates.map((member) => member.id);
    await db
      .update(workouts)
      .set({ memberId: keep.id })
      .where(inArray(workouts.memberId, duplicateIds));
    await db
      .update(routines)
      .set({ memberId: keep.id })
      .where(inArray(routines.memberId, duplicateIds));
    await db.delete(members).where(inArray(members.id, duplicateIds));
  }
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
    const db = drizzlePglite(client, { schema }) as unknown as Db;
    await ensureCanonicalFamily(db);
    await mergeDuplicateMembers(db);
    return db;
  }

  const isNeon = url.includes("neon.tech");
  const needsSsl =
    url.includes("sslmode=require") ||
    isNeon ||
    url.includes("supabase.co");
  const usePooler =
    isNeon ||
    url.includes("pgbouncer=true") ||
    url.includes("-pooler.");

  const sql = postgres(url, {
    // Serverless: one connection per instance; Neon pooler needs prepare: false.
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: needsSsl ? "require" : false,
    prepare: !usePooler,
  });

  const statements = SCHEMA_SQL.split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  for (const statement of statements) {
    await sql.unsafe(statement);
  }

  const db = drizzlePg(sql, { schema });
  await ensureCanonicalFamily(db);
  await mergeDuplicateMembers(db);
  return db;
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
