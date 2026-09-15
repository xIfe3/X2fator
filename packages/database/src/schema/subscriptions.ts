import {
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { subscriptionStatusEnum } from "./enums";

import { users } from "./users";
import { plans } from "./plans";

export const planSubscriptions = pgTable(
  "plan_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
      }),

    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, {
        onDelete: "restrict",
      }),

    amountPaid: numeric("amount_paid", {
      precision: 18,
      scale: 2,
    }).notNull(),

    dailyTaskLimit: integer("daily_task_limit").notNull(),

    dailyReward: numeric("daily_reward", {
      precision: 18,
      scale: 2,
    }).notNull(),

    referralRewardRate: numeric("referral_reward_rate", {
      precision: 8,
      scale: 4,
    }).notNull(),

    startsAt: timestamp("starts_at", {
      withTimezone: true,
    }).notNull(),

    status: subscriptionStatusEnum("status").notNull().default("pending"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("subscriptions_user_idx").on(table.userId),

    planIdx: index("subscriptions_plan_idx").on(table.planId),

    statusIdx: index("subscriptions_status_idx").on(table.status),
  }),
);

export type PlanSubscription = typeof planSubscriptions.$inferSelect;

export type NewPlanSubscription = typeof planSubscriptions.$inferInsert;
