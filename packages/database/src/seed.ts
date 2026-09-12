import { config } from "dotenv";

config({ path: "../../.env" });

async function main() {
  const { db, pool } = await import("./client");
  const { roles, permissions, rolePermissions, userRoles, users, wallets } =
    await import("./schema");
  const { eq, inArray } = await import("drizzle-orm");
  const bcrypt = await import("bcrypt");

  const PERMISSIONS: { name: string; description: string }[] = [
    { name: "users.read", description: "View user accounts" },
    { name: "users.suspend", description: "Suspend a user account" },
    { name: "users.activate", description: "Reactivate a user account" },
    { name: "users.block", description: "Permanently block a user account" },
    {
      name: "users.update",
      description: "Edit user account details and reset passwords",
    },
    { name: "withdrawals.read", description: "View withdrawal requests" },
    { name: "withdrawals.reject", description: "Reject a withdrawal request" },
    {
      name: "wallets.adjust",
      description: "Manually credit or debit a user's wallet",
    },
    { name: "audit.read", description: "View the admin audit log" },
  ];

  console.log("Seeding permissions...");
  await db
    .insert(permissions)
    .values(PERMISSIONS)
    .onConflictDoNothing({ target: permissions.name });

  const permissionRows = await db
    .select()
    .from(permissions)
    .where(
      inArray(
        permissions.name,
        PERMISSIONS.map((p) => p.name),
      ),
    );
  console.log(
    `  ${permissionRows.length}/${PERMISSIONS.length} permissions present`,
  );

  console.log("Seeding roles...");
  await db
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
    .onConflictDoNothing({ target: roles.name });

  const [userRole, adminRole] = await Promise.all([
    db.query.roles.findFirst({ where: eq(roles.name, "user") }),
    db.query.roles.findFirst({ where: eq(roles.name, "admin") }),
  ]);
  if (!userRole || !adminRole) {
    throw new Error(
      "Failed to seed 'user'/'admin' roles — check the roles table manually.",
    );
  }
  console.log(`  user role: ${userRole.id}`);
  console.log(`  admin role: ${adminRole.id}`);

  console.log("Granting all permissions to 'admin'...");
  await db
    .insert(rolePermissions)
    .values(
      permissionRows.map((p: any) => ({
        roleId: adminRole.id,
        permissionId: p.id,
      })),
    )
    .onConflictDoNothing({
      target: [rolePermissions.roleId, rolePermissions.permissionId],
    });
  console.log(`  ${permissionRows.length} permissions granted to admin`);

  // --- Bootstrap admin account -------------------------------------
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@2xfactor.local")
    .trim()
    .toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, adminEmail),
  });

  if (existingAdmin) {
    console.log(
      `Admin user ${adminEmail} already exists (${existingAdmin.id}) — skipping.`,
    );
  } else {
    console.log(`Creating admin user ${adminEmail}...`);
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const referralCode =
      "XF" + Math.random().toString(36).substring(2, 8).toUpperCase();

    await db.transaction(async (tx: any) => {
      const [admin] = await tx
        .insert(users)
        .values({
          email: adminEmail,
          passwordHash,
          firstName: "2xFactor",
          lastName: "Admin",
          referralCode,
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

    console.log("  done.");
    console.log(`  Log in with: ${adminEmail} / ${adminPassword}`);
    console.log(
      "  Change this password immediately if this is anywhere near production.",
    );
  }

  await pool.end();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
