import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { notificationChannelEnum, notificationTypeEnum } from "./enums";

import { users } from "./users";
import { jsonb } from "drizzle-orm/pg-core";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    type: notificationTypeEnum("type").notNull().default("general"),

    channel: notificationChannelEnum("channel").notNull().default("in_app"),

    title: varchar("title", {
      length: 255,
    }).notNull(),

    message: text("message").notNull(),

    isRead: boolean("is_read").notNull().default(false),

    readAt: timestamp("read_at", {
      withTimezone: true,
    }),

    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("notifications_user_idx").on(table.userId),

    unreadIdx: index("notifications_unread_idx").on(table.userId, table.isRead),
  }),
);

export type Notification = typeof notifications.$inferSelect;

export type NewNotification = typeof notifications.$inferInsert;
