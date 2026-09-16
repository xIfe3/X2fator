import {
  index,
  pgTable,
  bigint,
  jsonb,
  text,
  timestamp,
  uuid,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const deposits = pgTable(
  "deposits",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    amount: bigint("amount", {
      mode: "number",
    }).notNull(),

    currency: varchar("currency", {
      length: 3,
    })
      .default("NGN")
      .notNull(),

    provider: varchar("provider", {
      length: 50,
    }).notNull(),

    providerReference: varchar("provider_reference", {
      length: 150,
    }),

    reference: varchar("reference", {
      length: 100,
    })
      .notNull()
      .unique(),

    status: varchar("status", {
      length: 30,
    })
      .default("pending")
      .notNull(),

    failureReason: text("failure_reason"),

    metadata: jsonb("metadata"),

    paidAt: timestamp("paid_at", {
      withTimezone: true,
    }),

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
    userIdx: index("deposits_user_idx").on(table.userId),

    statusIdx: index("deposits_status_idx").on(table.status),

    providerReferenceIdx: uniqueIndex("deposits_provider_reference_idx").on(
      table.providerReference,
    ),
  }),
);

export type Deposit = typeof deposits.$inferSelect;

export type NewDeposit = typeof deposits.$inferInsert;
