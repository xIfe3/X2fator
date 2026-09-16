import { integer, numeric, pgTable, timestamp } from "drizzle-orm/pg-core";

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

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export type WithdrawalSettings = typeof withdrawalSettings.$inferSelect;
export type NewWithdrawalSettings = typeof withdrawalSettings.$inferInsert;
