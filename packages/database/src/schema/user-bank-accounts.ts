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

export const userBankAccounts = pgTable(
  "user_bank_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    bankCode: varchar("bank_code", {
      length: 20,
    }).notNull(),

    bankName: varchar("bank_name", {
      length: 150,
    }).notNull(),

    accountNumber: varchar("account_number", {
      length: 20,
    }).notNull(),

    accountName: varchar("account_name", {
      length: 150,
    }).notNull(),

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
    userIdx: index("user_bank_accounts_user_idx").on(table.userId),

    accountNumberIdx: index("user_bank_accounts_account_number_idx").on(
      table.accountNumber,
    ),

    userAccountUnique: uniqueIndex("user_bank_accounts_user_account_unique").on(
      table.userId,
      table.accountNumber,
    ),
  }),
);

export type UserBankAccount = typeof userBankAccounts.$inferSelect;
export type NewUserBankAccount = typeof userBankAccounts.$inferInsert;
