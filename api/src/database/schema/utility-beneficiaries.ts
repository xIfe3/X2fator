import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";
import { networkProviderEnum } from "./enums";

export const utilityBeneficiaries = pgTable(
  "utility_beneficiaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    provider: networkProviderEnum("provider").notNull(),

    phoneNumber: varchar("phone_number", {
      length: 20,
    }).notNull(),

    label: varchar("label", {
      length: 60,
    }),

    isDefault: boolean("is_default").notNull().default(false),

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
    userIdx: index("utility_beneficiaries_user_idx").on(table.userId),

    userPhoneProviderUnique: uniqueIndex(
      "utility_beneficiaries_user_phone_provider_unique",
    ).on(table.userId, table.phoneNumber, table.provider),
  }),
);

export type UtilityBeneficiary = typeof utilityBeneficiaries.$inferSelect;
export type NewUtilityBeneficiary = typeof utilityBeneficiaries.$inferInsert;
