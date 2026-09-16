import {
  pgTable,
  uuid,
  numeric,
  timestamp,
  varchar,
  text,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

import { earningSourceEnum, earningStatusEnum } from "./enums";

import { users } from "./users";

export const earnings = pgTable(
  "earnings",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    source: earningSourceEnum("source").notNull(),

    amount: numeric("amount", {
      precision: 20,
      scale: 2,
    }).notNull(),

    status: earningStatusEnum("status").default("credited").notNull(),

    reference: varchar("reference", {
      length: 100,
    })
      .notNull()
      .unique(),

    description: text("description"),

    metadata: jsonb("metadata"),

    earningDate: timestamp("earning_date", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

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
    userIdx: index("earnings_user_idx").on(table.userId),

    sourceIdx: index("earnings_source_idx").on(table.source),

    dateIdx: index("earnings_date_idx").on(table.earningDate),

    statusIdx: index("earnings_status_idx").on(table.status),
  }),
);
