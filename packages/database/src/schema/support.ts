import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { ticketPriorityEnum, ticketStatusEnum } from "./enums";

import { users } from "./users";

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),

    subject: varchar("subject", {
      length: 255,
    }).notNull(),

    status: ticketStatusEnum("status").notNull().default("open"),

    priority: ticketPriorityEnum("priority").notNull().default("medium"),

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

    resolvedAt: timestamp("resolved_at", {
      withTimezone: true,
    }),
  },
  (table) => ({
    userIdx: index("support_tickets_user_idx").on(table.userId),

    assignedIdx: index("support_tickets_assigned_idx").on(table.assignedTo),

    statusIdx: index("support_tickets_status_idx").on(table.status),
  }),
);

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, {
        onDelete: "cascade",
      }),

    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
      }),

    message: text("message").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    ticketIdx: index("support_messages_ticket_idx").on(table.ticketId),

    senderIdx: index("support_messages_sender_idx").on(table.senderId),
  }),
);

export type SupportTicket = typeof supportTickets.$inferSelect;

export type NewSupportTicket = typeof supportTickets.$inferInsert;

export type SupportMessage = typeof supportMessages.$inferSelect;

export type NewSupportMessage = typeof supportMessages.$inferInsert;
