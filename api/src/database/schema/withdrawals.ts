import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { walletTypeEnum, withdrawalStatusEnum } from "./enums";

import { users } from "./users";

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
      }),

    walletType: walletTypeEnum("wallet_type").notNull().default("task"),

    amount: numeric("amount", {
      precision: 18,
      scale: 2,
    }).notNull(),

    fee: numeric("fee", {
      precision: 18,
      scale: 2,
    })
      .notNull()
      .default("0"),

    netAmount: numeric("net_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),

    bankName: varchar("bank_name", {
      length: 150,
    }).notNull(),

    bankCode: varchar("bank_code", {
      length: 10,
    }),

    accountNumber: varchar("account_number", {
      length: 20,
    }).notNull(),

    accountName: varchar("account_name", {
      length: 150,
    }).notNull(),

    transactionReference: varchar("transaction_reference", {
      length: 150,
    })
      .notNull()
      .unique(),

    status: withdrawalStatusEnum("status").notNull().default("pending"),

    rejectionReason: text("rejection_reason"),

    adminNote: text("admin_note"),

    processedBy: uuid("processed_by").references(() => users.id, {
      onDelete: "set null",
    }),

    processedAt: timestamp("processed_at", {
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
    userIdx: index("withdrawals_user_idx").on(table.userId),

    statusIdx: index("withdrawals_status_idx").on(table.status),

    createdAtIdx: index("withdrawals_created_at_idx").on(table.createdAt),
  }),
);

export type Withdrawal = typeof withdrawals.$inferSelect;

export type NewWithdrawal = typeof withdrawals.$inferInsert;
