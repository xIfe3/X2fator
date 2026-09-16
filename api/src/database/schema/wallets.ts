import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import {
  transactionDirectionEnum,
  transactionStatusEnum,
  walletStatusEnum,
  walletTransactionTypeEnum,
  walletTypeEnum,
} from "./enums";

import { users } from "./users";

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    type: walletTypeEnum("type").notNull(),

    balance: numeric("balance", {
      precision: 18,
      scale: 2,
    })
      .notNull()
      .default("0"),

    status: walletStatusEnum("status").notNull().default("active"),

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
    userIdx: index("wallets_user_idx").on(table.userId),

    userTypeUnique: uniqueIndex("wallets_user_type_unique").on(
      table.userId,
      table.type,
    ),
  }),
);

export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, {
        onDelete: "restrict",
      }),

    type: walletTransactionTypeEnum("type").notNull(),

    direction: transactionDirectionEnum("direction").notNull(),

    amount: numeric("amount", {
      precision: 18,
      scale: 2,
    }).notNull(),

    balanceBefore: numeric("balance_before", {
      precision: 18,
      scale: 2,
    }).notNull(),

    balanceAfter: numeric("balance_after", {
      precision: 18,
      scale: 2,
    }).notNull(),

    reference: varchar("reference", {
      length: 100,
    })
      .notNull()
      .unique(),

    description: text("description"),

    metadata: jsonb("metadata"),

    status: transactionStatusEnum("status").notNull().default("completed"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    walletIdx: index("wallet_transactions_wallet_idx").on(table.walletId),

    referenceIdx: index("wallet_transactions_reference_idx").on(
      table.reference,
    ),

    typeIdx: index("wallet_transactions_type_idx").on(table.type),

    createdAtIdx: index("wallet_transactions_created_at_idx").on(
      table.createdAt,
    ),
  }),
);

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;

export type WalletTransaction = typeof walletTransactions.$inferSelect;

export type NewWalletTransaction = typeof walletTransactions.$inferInsert;
