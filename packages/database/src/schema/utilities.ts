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
  networkProviderEnum,
  utilityPurchaseStatusEnum,
  utilityTypeEnum,
} from "./enums";

import { users } from "./users";

export const utilityPurchases = pgTable(
  "utility_purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
      }),

    type: utilityTypeEnum("type").notNull(),

    provider: networkProviderEnum("provider").notNull(),

    phoneNumber: varchar("phone_number", {
      length: 20,
    }).notNull(),

    amount: numeric("amount", {
      precision: 18,
      scale: 2,
    }).notNull(),

    reference: varchar("reference", {
      length: 150,
    })
      .notNull()
      .unique(),

    providerReference: varchar("provider_reference", {
      length: 255,
    }),

    status: utilityPurchaseStatusEnum("status").notNull().default("pending"),

    productCode: varchar("product_code", {
      length: 100,
    }),

    responseMessage: text("response_message"),

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
    userIdx: index("utility_purchases_user_idx").on(table.userId),

    referenceIdx: index("utility_purchases_reference_idx").on(table.reference),

    statusIdx: index("utility_purchases_status_idx").on(table.status),

    providerReferenceIdx: index("utility_purchases_provider_reference_idx").on(
      table.providerReference,
    ),
  }),
);

export type UtilityPurchase = typeof utilityPurchases.$inferSelect;

export type NewUtilityPurchase = typeof utilityPurchases.$inferInsert;
