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

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export type WithdrawalSettings = typeof withdrawalSettings.$inferSelect;
export type NewWithdrawalSettings = typeof withdrawalSettings.$inferInsert;
