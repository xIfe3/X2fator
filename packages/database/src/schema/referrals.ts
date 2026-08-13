import {
  index,
  numeric,
  pgTable,
  timestamp,
  varchar,
  uuid,
} from "drizzle-orm/pg-core";

import { referralStatusEnum } from "./enums";

import { users } from "./users";
import { planSubscriptions } from "./subscriptions";

export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    referrerId: uuid("referrer_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
      }),

    referredUserId: uuid("referred_user_id")
      .notNull()
      .unique()
      .references(() => users.id, {
        onDelete: "restrict",
      }),

    commissionRate: numeric("commission_rate", {
      precision: 8,
      scale: 4,
    }).notNull(),

    totalCommission: numeric("total_commission", {
      precision: 18,
      scale: 2,
    })
      .notNull()
      .default("0"),

    sourceSubscriptionId: uuid("source_subscription_id").references(
      () => planSubscriptions.id,
      {
        onDelete: "set null",
      },
    ),

    commissionReference: varchar("commission_reference", {
      length: 150,
    }).unique(),

    commissionPaidAt: timestamp("commission_paid_at", {
      withTimezone: true,
    }),

    status: referralStatusEnum("status").notNull().default("pending"),

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
    referrerIdx: index("referrals_referrer_idx").on(table.referrerId),

    referredUserIdx: index("referrals_referred_user_idx").on(
      table.referredUserId,
    ),

    statusIdx: index("referrals_status_idx").on(table.status),

    sourceSubscriptionIdx: index("referrals_source_subscription_idx").on(
      table.sourceSubscriptionId,
    ),
  }),
);

export type Referral = typeof referrals.$inferSelect;
export type NewReferral = typeof referrals.$inferInsert;
