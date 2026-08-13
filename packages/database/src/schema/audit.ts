import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { adminActionEnum, auditEntityTypeEnum } from "./enums";

import { users } from "./users";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),

    action: adminActionEnum("action").notNull(),

    entityType: auditEntityTypeEnum("entity_type").notNull(),

    entityId: uuid("entity_id"),

    description: text("description"),

    oldValues: jsonb("old_values"),

    newValues: jsonb("new_values"),

    ipAddress: varchar("ip_address", {
      length: 45,
    }),

    userAgent: text("user_agent"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    actorIdx: index("audit_logs_actor_idx").on(table.actorId),

    entityIdx: index("audit_logs_entity_idx").on(
      table.entityType,
      table.entityId,
    ),

    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  }),
);

export type AuditLog = typeof auditLogs.$inferSelect;

export type NewAuditLog = typeof auditLogs.$inferInsert;
