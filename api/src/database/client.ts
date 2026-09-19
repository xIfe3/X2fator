import { drizzle as drizzleNodePostgres } from "drizzle-orm/node-postgres";
import { migrate as migrateNodePostgres } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { migrate as migrateNeon } from "drizzle-orm/neon-serverless/migrator";
import { Pool as NodePgPool } from "pg";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { join } from "path";

import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5444/xfactor";

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// Neon hosts only speak the WebSocket-tunneled wire protocol on some
// deployment targets (e.g. hosts that firewall outbound 5432 but allow
// 443), so they need the `neon-serverless` driver. Anything else — local
// Docker Postgres, any other standard Postgres host — speaks plain TCP
// and needs the regular `node-postgres` driver, which the Neon driver
// can't talk to. Detecting this from the connection string means local
// dev and a Neon-backed deployment both work without editing this file
// when switching environments.
const isNeon = /\.neon\.tech$/i.test(getHostname(connectionString));

const poolConfig = {
  connectionString,
  max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
};

function createNeonDb() {
  neonConfig.webSocketConstructor = ws;
  const pool = new NeonPool(poolConfig);
  return { pool, db: drizzleNeon(pool, { schema }), isNeon: true as const };
}

function createNodePostgresDb() {
  const pool = new NodePgPool({
    ...poolConfig,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return {
    pool,
    db: drizzleNodePostgres(pool, { schema }),
    isNeon: false as const,
  };
}

const connection = isNeon ? createNeonDb() : createNodePostgresDb();

export const { pool, db } = connection;

export type Database = typeof db;

// Migration SQL files live at the project root's `drizzle/` folder
// regardless of the compiled output's location (dist/database vs
// src/database), so this walks up two levels from wherever this file
// itself is running from.
const MIGRATIONS_FOLDER = join(__dirname, "..", "..", "drizzle");

/**
 * Applies any not-yet-applied SQL migrations from `drizzle/` directly
 * against the configured database, using drizzle-orm's own migrator
 * (not the drizzle-kit CLI, which is a devDependency and isn't
 * installed in a production build). Safe to call on every boot — each
 * migration is tracked in a `__drizzle_migrations` table and only
 * applied once.
 */
export async function runMigrations(): Promise<void> {
  if (connection.isNeon) {
    await migrateNeon(connection.db, { migrationsFolder: MIGRATIONS_FOLDER });
  } else {
    await migrateNodePostgres(connection.db, {
      migrationsFolder: MIGRATIONS_FOLDER,
    });
  }
}
