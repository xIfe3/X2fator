import { config } from "dotenv";
import path from "path";

import { PERMISSIONS } from "./permissions";

// Resolve relative to this file, not process.cwd() — dotenv's `path`
// is CWD-relative by default, which breaks depending on where the
// script is invoked from (repo root vs. api/ vs. dist/database/).
config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  const { db, pool } = await import("./client");
  const {
    roles,
    permissions,
    rolePermissions,
    userRoles,
    users,
    wallets,
    plans,
    tasks,
  } = await import("./schema");
  const { eq, inArray } = await import("drizzle-orm");
  const bcrypt = await import("bcrypt");


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

  // --- Plans ---------------------------------------------------------
  const PLAN_SEED: (typeof plans.$inferInsert)[] = [
    {
      name: "Starter",
      description: "Entry-level plan for new users testing the platform.",
      price: "1000.00",
      rank: 1,
      dailyTaskLimit: 3,
      dailyReward: "50.00",
      referralRewardAmount: "50.00",
      minimumWithdrawal: "500.00",
      status: "active",
      isFeatured: false,
    },
    {
      name: "Basic",
      description: "A step up from Starter with more daily tasks.",
      price: "2500.00",
      rank: 2,
      dailyTaskLimit: 5,
      dailyReward: "120.00",
      referralRewardAmount: "150.00",
      minimumWithdrawal: "500.00",
      status: "active",
      isFeatured: false,
    },
    {
      name: "Bronze",
      description: "Solid mid-tier plan for consistent earners.",
      price: "5000.00",
      rank: 3,
      dailyTaskLimit: 8,
      dailyReward: "250.00",
      referralRewardAmount: "350.00",
      minimumWithdrawal: "1000.00",
      status: "active",
      isFeatured: true,
    },
    {
      name: "Silver",
      description: "Higher daily reward cap and referral rate.",
      price: "10000.00",
      rank: 4,
      dailyTaskLimit: 10,
      dailyReward: "500.00",
      referralRewardAmount: "800.00",
      minimumWithdrawal: "1000.00",
      status: "active",
      isFeatured: false,
    },
    {
      name: "Gold",
      description: "Popular plan with strong daily returns.",
      price: "20000.00",
      rank: 5,
      dailyTaskLimit: 15,
      dailyReward: "1000.00",
      referralRewardAmount: "1800.00",
      minimumWithdrawal: "2000.00",
      status: "active",
      isFeatured: true,
    },
    {
      name: "Platinum",
      description: "Premium plan for serious earners.",
      price: "35000.00",
      rank: 6,
      dailyTaskLimit: 20,
      dailyReward: "1800.00",
      referralRewardAmount: "3500.00",
      minimumWithdrawal: "2500.00",
      status: "active",
      isFeatured: false,
    },
    {
      name: "Diamond",
      description: "High-tier plan with premium daily rewards.",
      price: "50000.00",
      rank: 7,
      dailyTaskLimit: 25,
      dailyReward: "2800.00",
      referralRewardAmount: "5500.00",
      minimumWithdrawal: "3000.00",
      status: "active",
      isFeatured: false,
    },
    {
      name: "Elite",
      description: "Top-tier plan with maximum daily task access.",
      price: "75000.00",
      rank: 8,
      dailyTaskLimit: 30,
      dailyReward: "4200.00",
      referralRewardAmount: "9000.00",
      minimumWithdrawal: "5000.00",
      status: "active",
      isFeatured: true,
    },
    {
      name: "VIP",
      description: "Exclusive plan with the best referral rate available.",
      price: "100000.00",
      rank: 9,
      dailyTaskLimit: 40,
      dailyReward: "6000.00",
      referralRewardAmount: "13000.00",
      minimumWithdrawal: "5000.00",
      status: "active",
      isFeatured: false,
    },
    {
      name: "Legacy",
      description: "Legacy plan retained for existing subscribers only.",
      price: "150000.00",
      rank: 10,
      dailyTaskLimit: 50,
      dailyReward: "9000.00",
      referralRewardAmount: "22500.00",
      minimumWithdrawal: "10000.00",
      status: "inactive",
      isFeatured: false,
    },
  ];

  console.log(`Seeding ${PLAN_SEED.length} plans...`);
  await db.insert(plans).values(PLAN_SEED).onConflictDoNothing({
    target: plans.name,
  });
  const planRows = await db
    .select()
    .from(plans)
    .where(
      inArray(
        plans.name,
        PLAN_SEED.map((p) => p.name),
      ),
    );
  console.log(`  ${planRows.length}/${PLAN_SEED.length} plans present`);

  // --- Tasks -----------------------------------------------------------
  const TASK_TYPES = ["video", "app", "other"] as const;

  const TASK_SEED: (typeof tasks.$inferInsert)[] = [
    {
      title: "Watch: Product intro video",
      description: "Watch the 60-second product introduction video.",
      reward: "20.00",
      durationSeconds: 60,
      taskType: "video",
      targetUrl: "https://example.com/videos/product-intro",
      status: "active",
    },
    {
      title: "Watch: Platform walkthrough",
      description: "Watch a full walkthrough of the platform features.",
      reward: "35.00",
      durationSeconds: 180,
      taskType: "video",
      targetUrl: "https://example.com/videos/walkthrough",
      status: "active",
    },
    {
      title: "Watch: Partner ad — FinFlow",
      description: "Watch a short sponsored ad from our partner FinFlow.",
      reward: "15.00",
      durationSeconds: 30,
      taskType: "video",
      targetUrl: "https://example.com/videos/finflow-ad",
      status: "active",
    },
    {
      title: "Watch: Tutorial — earning tips",
      description: "Watch tips on maximizing your daily earnings.",
      reward: "25.00",
      durationSeconds: 120,
      taskType: "video",
      targetUrl: "https://example.com/videos/earning-tips",
      status: "active",
    },
    {
      title: "Watch: Weekly highlights reel",
      description: "Catch up on this week's platform highlights.",
      reward: "18.00",
      durationSeconds: 90,
      taskType: "video",
      targetUrl: "https://example.com/videos/weekly-highlights",
      status: "active",
    },
    {
      title: "Watch: Sponsor spotlight — CloudPay",
      description: "Watch a spotlight video on sponsor CloudPay.",
      reward: "22.00",
      durationSeconds: 45,
      taskType: "video",
      targetUrl: "https://example.com/videos/cloudpay-spotlight",
      status: "active",
    },
    {
      title: "Install: ShopEasy app",
      description: "Download and install the ShopEasy shopping app.",
      reward: "80.00",
      durationSeconds: null,
      taskType: "app",
      targetUrl: "https://example.com/apps/shopeasy",
      status: "active",
    },
    {
      title: "Install: FitTrack fitness app",
      description: "Download and open the FitTrack fitness app once.",
      reward: "70.00",
      durationSeconds: null,
      taskType: "app",
      targetUrl: "https://example.com/apps/fittrack",
      status: "active",
    },
    {
      title: "Install: BudgetWise finance app",
      description: "Download BudgetWise and complete the signup screen.",
      reward: "90.00",
      durationSeconds: null,
      taskType: "app",
      targetUrl: "https://example.com/apps/budgetwise",
      status: "active",
    },
    {
      title: "Install: QuickChat messenger",
      description: "Download and install the QuickChat messenger app.",
      reward: "60.00",
      durationSeconds: null,
      taskType: "app",
      targetUrl: "https://example.com/apps/quickchat",
      status: "active",
    },
    {
      title: "Install: TravelMate app",
      description: "Download and install the TravelMate travel planner.",
      reward: "75.00",
      durationSeconds: null,
      taskType: "app",
      targetUrl: "https://example.com/apps/travelmate",
      status: "active",
    },
    {
      title: "Install: GameHub arcade app",
      description: "Download GameHub and launch it once.",
      reward: "65.00",
      durationSeconds: null,
      taskType: "app",
      targetUrl: "https://example.com/apps/gamehub",
      status: "active",
    },
    {
      title: "Install: NewsDaily reader app",
      description: "Download and install the NewsDaily news reader.",
      reward: "55.00",
      durationSeconds: null,
      taskType: "app",
      targetUrl: "https://example.com/apps/newsdaily",
      status: "active",
    },
    {
      title: "Survey: Shopping habits",
      description: "Complete a short 2-minute survey about shopping habits.",
      reward: "30.00",
      durationSeconds: 120,
      taskType: "other",
      targetUrl: "https://example.com/surveys/shopping-habits",
      status: "active",
    },
    {
      title: "Survey: App experience feedback",
      description: "Give feedback about your experience using the app.",
      reward: "28.00",
      durationSeconds: 90,
      taskType: "other",
      targetUrl: "https://example.com/surveys/app-feedback",
      status: "active",
    },
    {
      title: "Follow: Official Twitter/X page",
      description: "Follow the official page and submit a screenshot.",
      reward: "12.00",
      durationSeconds: null,
      taskType: "other",
      targetUrl: "https://example.com/social/twitter",
      status: "active",
    },
    {
      title: "Join: Telegram community",
      description: "Join the official Telegram community group.",
      reward: "14.00",
      durationSeconds: null,
      taskType: "other",
      targetUrl: "https://example.com/social/telegram",
      status: "active",
    },
    {
      title: "Sign up: Partner newsletter",
      description: "Subscribe to a partner newsletter with your email.",
      reward: "10.00",
      durationSeconds: null,
      taskType: "other",
      targetUrl: "https://example.com/newsletter/partner",
      status: "active",
    },
    {
      title: "Review: Rate us on the app store",
      description: "Leave a rating and short review on the app store.",
      reward: "40.00",
      durationSeconds: null,
      taskType: "other",
      targetUrl: "https://example.com/review",
      status: "active",
    },
    {
      title: "Quiz: Platform knowledge check",
      description: "Answer 5 quick questions about how the platform works.",
      reward: "16.00",
      durationSeconds: 60,
      taskType: "other",
      targetUrl: "https://example.com/quiz/platform",
      status: "active",
    },
  ];

  console.log(`Seeding ${TASK_SEED.length} tasks...`);
  // tasks.title has no unique constraint to hang onConflictDoNothing off
  // of, so re-runs are made idempotent by checking existing titles first.
  const existingTasks = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(
      inArray(
        tasks.title,
        TASK_SEED.map((t) => t.title),
      ),
    );
  const existingTitles = new Set(existingTasks.map((t: any) => t.title));
  const newTasks = TASK_SEED.filter((t) => !existingTitles.has(t.title));
  if (newTasks.length > 0) {
    await db.insert(tasks).values(newTasks);
  }
  const taskRows = await db
    .select()
    .from(tasks)
    .where(
      inArray(
        tasks.title,
        TASK_SEED.map((t) => t.title),
      ),
    );
  console.log(`  ${taskRows.length}/${TASK_SEED.length} tasks present`);
  const byType = TASK_TYPES.map(
    (t) => `${t}: ${taskRows.filter((r: any) => r.taskType === t).length}`,
  ).join(", ");
  console.log(`  by type -> ${byType}`);

  await pool.end();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
