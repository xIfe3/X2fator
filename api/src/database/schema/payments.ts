import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import {
  depositStatusEnum,
  paymentProviderEnum,
  paymentStatusEnum,
} from "./enums";

import { users } from "./users";
import { deposits } from "./deposits";

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
      }),

    depositId: uuid("deposit_id").references(() => deposits.id, {
      onDelete: "set null",
    }),

    provider: paymentProviderEnum("provider").notNull(),

    reference: varchar("reference", {
      length: 150,
    })
      .notNull()
      .unique(),

    providerReference: varchar("provider_reference", {
      length: 255,
    }),

    amount: numeric("amount", {
      precision: 18,
      scale: 2,
    }).notNull(),

    status: paymentStatusEnum("status").notNull().default("pending"),

    rawResponse: text("raw_response"),

    // Arbitrary context for non-deposit payments (e.g. { purpose:
    // 'plan_purchase', planId } for the signup-time plan payment flow).
    metadata: jsonb("metadata"),

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
    userIdx: index("payments_user_idx").on(table.userId),

    referenceIdx: index("payments_reference_idx").on(table.reference),

    providerReferenceIdx: index("payments_provider_reference_idx").on(
      table.providerReference,
    ),
  }),
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
