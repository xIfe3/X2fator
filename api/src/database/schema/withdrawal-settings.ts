import { sql } from "drizzle-orm";
import { boolean, integer, numeric, pgTable, timestamp } from "drizzle-orm/pg-core";

// Single-row table holding admin-configurable withdrawal rules.
// Referral wallet: withdrawable anytime, subject to a minimum amount.
// Task wallet: withdrawable only on one day of the month, set by an admin.
export const withdrawalSettings = pgTable("withdrawal_settings", {
  id: integer("id").primaryKey().default(1),

  referralMinimumWithdrawal: numeric("referral_minimum_withdrawal", {
    precision: 18,
    scale: 2,
  })
    .notNull()
    .default("1000"),

  taskWithdrawalDay: integer("task_withdrawal_day").notNull().default(1),

  // When true, a submitted withdrawal is sent straight to Flutterwave's
  // Transfer API and paid out automatically. When false, it just sits as
  // `pending` for an admin to review and approve/reject manually — the
  // original flow, kept as an admin-controlled fallback.
  autoPayoutEnabled: boolean("auto_payout_enabled").notNull().default(true),

  // Fee charged to the user on each withdrawal, deducted from the amount
  // they withdraw: fee = flat + amount * percent / 100. Covers the
  // Flutterwave transfer fee the platform is charged per payout.
  withdrawalFeeFlat: numeric("withdrawal_fee_flat", {
    precision: 18,
    scale: 2,
  })
    .notNull()
    .default("50"),

  withdrawalFeePercent: numeric("withdrawal_fee_percent", {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default("0"),

  // When enabled, a successfully paid-out TASK wallet withdrawal ends the
  // user's active plan, so they must buy a plan again (same rank or higher)
  // before they can earn from tasks. Only withdrawals requested on/after
  // `planRenewalEffectiveFrom` are affected.
  planRenewalAfterWithdrawalEnabled: boolean(
    "plan_renewal_after_withdrawal_enabled",
  )
    .notNull()
    .default(false),

  planRenewalEffectiveFrom: timestamp("plan_renewal_effective_from", {
    withTimezone: true,
  })
    .notNull()
    .default(sql`'2026-12-01 00:00:00+01'::timestamptz`),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export type WithdrawalSettings = typeof withdrawalSettings.$inferSelect;
export type NewWithdrawalSettings = typeof withdrawalSettings.$inferInsert;
