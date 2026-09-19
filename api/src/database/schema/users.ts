import {
  boolean,
  AnyPgColumn,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { genderEnum, userStatusEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    email: varchar("email", { length: 255 }).notNull().unique(),

    passwordHash: text("password_hash").notNull(),

    firstName: varchar("first_name", { length: 100 }).notNull(),

    lastName: varchar("last_name", { length: 100 }).notNull(),

    phone: varchar("phone", { length: 20 }).unique(),

    dateOfBirth: timestamp("date_of_birth", {
      withTimezone: true,
      mode: "date",
    }),

    gender: genderEnum("gender"),

    referralCode: varchar("referral_code", {
      length: 20,
    })
      .notNull()
      .unique(),

    referredById: uuid("referred_by_id").references(
      (): AnyPgColumn => users.id,
      {
        onDelete: "set null",
      },
    ),

    status: userStatusEnum("status").notNull().default("pending"),

    // Hashed 4-6 digit PIN required to authorize a withdrawal. Null until
    // the user sets one from the withdrawals page.
    withdrawalPinHash: text("withdrawal_pin_hash"),

    emailVerified: boolean("email_verified").notNull().default(false),

    phoneVerified: boolean("phone_verified").notNull().default(false),

    lastLoginAt: timestamp("last_login_at", {
      withTimezone: true,
    }),

    loginCount: integer("login_count").notNull().default(0),

    // Daily login-bonus streak tracking.
    currentStreak: integer("current_streak").notNull().default(0),

    longestStreak: integer("longest_streak").notNull().default(0),

    lastBonusClaimDate: timestamp("last_bonus_claim_date", {
      withTimezone: true,
      mode: "date",
    }),

    // Set once the user has either confirmed joining Telegram or
    // explicitly dismissed the prompt without joining — the popup
    // stops showing either way once this is set.
    telegramPromptSeenAt: timestamp("telegram_prompt_seen_at", {
      withTimezone: true,
    }),

    // Set only when the user checks "I've joined" — self-reported (no
    // bot integration verifies real membership), distinct from merely
    // dismissing the prompt.
    telegramJoinedAt: timestamp("telegram_joined_at", {
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
    emailIdx: index("users_email_idx").on(table.email),
    phoneIdx: index("users_phone_idx").on(table.phone),
    referralCodeIdx: index("users_referral_code_idx").on(table.referralCode),
    referredByIdx: index("users_referred_by_idx").on(table.referredById),
    statusIdx: index("users_status_idx").on(table.status),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
