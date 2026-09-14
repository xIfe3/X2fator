import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { planStatusEnum } from "./enums";

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: varchar("name", {
      length: 100,
    })
      .notNull()
      .unique(),

    description: text("description"),

    price: numeric("price", {
      precision: 18,
      scale: 2,
    }).notNull(),

    durationDays: integer("duration_days").notNull(),

    // Plans are ordered by rank (higher = better tier). Users may only
    // ever move up in rank — see SubscriptionsService.purchasePlan.
    rank: integer("rank").notNull().default(0),

    dailyTaskLimit: integer("daily_task_limit").notNull().default(0),

    dailyReward: numeric("daily_reward", {
      precision: 18,
      scale: 2,
    })
      .notNull()
      .default("0"),

    referralRewardRate: numeric("referral_reward_rate", {
      precision: 8,
      scale: 4,
    })
      .notNull()
      .default("0"),

    minimumWithdrawal: numeric("minimum_withdrawal", {
      precision: 18,
      scale: 2,
    })
      .notNull()
      .default("0"),

    status: planStatusEnum("status").notNull().default("draft"),

    isFeatured: boolean("is_featured").notNull().default(false),

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
    statusIdx: index("plans_status_idx").on(table.status),
  }),
);

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
