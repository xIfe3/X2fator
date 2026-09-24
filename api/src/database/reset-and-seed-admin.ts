import { config } from "dotenv";
import path from "path";

import { PERMISSIONS } from "./permissions";

// Launch-day reset: wipes EVERY row from every app table, then seeds only
// what the platform needs to boot — permissions, the 'user'/'admin'
// roles, and one bootstrap admin holding every permission. No demo plans
// or tasks (unlike seed.ts); create real ones from the admin panel.
//
// Targets DATABASE_URL. A DATABASE_URL already set in the shell wins over
// api/.env (dotenv never overrides existing vars), which is how to point
// this at production without editing .env.
//
//   npm run db:reset -- --dry-run     # show target + row counts, change nothing
//   npm run db:reset -- --confirm     # actually wipe and seed
//
// Requires RESET_ADMIN_PASSWORD; RESET_ADMIN_EMAIL defaults to
// admin@x2factor.com.
config({ path: path.resolve(__dirname, "../../.env") });

const ADMIN_EMAIL = (process.env.RESET_ADMIN_EMAIL ?? "admin@x2factor.com")
  .trim()
  .toLowerCase();
const ADMIN_PASSWORD = process.env.RESET_ADMIN_PASSWORD;
const ADMIN_USERNAME = "admin";

function describeTarget(url: string | undefined): string {
  if (!url) return "postgres://localhost:5444/xfactor (default — DATABASE_URL not set)";
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const confirmed = args.has("--confirm");

  console.log(`Target database: ${describeTarget(process.env.DATABASE_URL)}`);

  if (!dryRun && !confirmed) {
    console.error(
      "Refusing to run: this deletes ALL data. Re-run with --dry-run to inspect, or --confirm to proceed.",
    );
    process.exit(1);
  }
  if (!dryRun && !ADMIN_PASSWORD) {
    console.error("RESET_ADMIN_PASSWORD must be set.");
    process.exit(1);
  }

  const { db, pool, runMigrations } = await import("./client");
  const { roles, permissions, rolePermissions, userRoles, users, wallets } =
    await import("./schema");
  const { sql } = await import("drizzle-orm");
  const bcrypt = await import("bcrypt");

  try {
    // Drizzle's own migration bookkeeping lives in the "drizzle" schema,
    // so restricting to "public" leaves it intact.
    const tableResult = await db.execute(
      sql`select tablename from pg_tables where schemaname = 'public' order by tablename`,
    );
    const tables = (tableResult as unknown as { rows: { tablename: string }[] })
      .rows.map((r) => r.tablename);

    if (dryRun) {
      console.log(`\n${tables.length} tables that would be emptied:`);
      for (const t of tables) {
        const countResult = await db.execute(
          sql.raw(`select count(*)::int as n from "public"."${t}"`),
        );
        const n = (countResult as unknown as { rows: { n: number }[] }).rows[0]
          ?.n;
        console.log(`  ${t.padEnd(28)} ${n} rows`);
      }
      console.log(`\nWould then seed admin: ${ADMIN_EMAIL}`);
      console.log("Dry run — nothing changed.");
      return;
    }

    // Make sure the schema is current before seeding it — a fresh or
    // behind database would otherwise fail on missing columns. (Not in
    // --dry-run, which must change nothing.)
    console.log("Applying pending migrations...");
    await runMigrations();

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD!, 12);

    await db.transaction(async (tx) => {
      console.log(`Emptying ${tables.length} tables...`);
      const list = tables.map((t) => `"public"."${t}"`).join(", ");
      await tx.execute(sql.raw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`));

      console.log(`Seeding ${PERMISSIONS.length} permissions...`);
      const permissionRows = await tx
        .insert(permissions)
        .values(PERMISSIONS)
        .returning();

      console.log("Seeding roles...");
      const [userRole, adminRole] = await tx
        .insert(roles)
        .values([
          {
            name: "user",
            description: "Default role assigned to every new signup",
            isSystemRole: true,
          },
          {
            name: "admin",
            description: "Full administrative access",
            isSystemRole: true,
          },
        ])
        .returning();

      await tx.insert(rolePermissions).values(
        permissionRows.map((p) => ({
          roleId: adminRole.id,
          permissionId: p.id,
        })),
      );

      console.log(`Creating admin ${ADMIN_EMAIL}...`);
      const [admin] = await tx
        .insert(users)
        .values({
          email: ADMIN_EMAIL,
          username: ADMIN_USERNAME,
          passwordHash,
          firstName: "X2Factor",
          lastName: "Admin",
          // Username doubles as the referral code, same as a normal signup.
          referralCode: ADMIN_USERNAME,
          status: "active",
          emailVerified: true,
        })
        .returning();

      await tx.insert(userRoles).values([
        { userId: admin.id, roleId: adminRole.id },
        { userId: admin.id, roleId: userRole.id },
      ]);

      await tx.insert(wallets).values([
        { userId: admin.id, type: "account", balance: "0", status: "active" },
        { userId: admin.id, type: "task", balance: "0", status: "active" },
        { userId: admin.id, type: "referral", balance: "0", status: "active" },
      ]);
    });

    console.log("\nDone. Database wiped and admin seeded.");
    console.log(`  Admin login: ${ADMIN_EMAIL}`);
    console.log(
      "  No plans exist yet — create at least one active plan in the admin panel before opening signups.",
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
