import {
  AnyPgColumn,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { adStatusEnum, adTypeEnum } from "./enums";
import { users } from "./users";
import { tasks } from "./tasks";

export const ads = pgTable(
  "ads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    adType: adTypeEnum("ad_type").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description"),
    targetUrl: text("target_url").notNull(),
    budget: numeric("budget", { precision: 18, scale: 2 }).notNull(),
    quantity: integer("quantity").notNull().default(1),

    // Price per unit at the time the campaign was created, snapshotted so
    // later admin rate changes don't retroactively affect an in-flight ad.
    pricePerUnit: numeric("price_per_unit", {
      precision: 18,
      scale: 2,
    }).notNull(),

    // Slots left to be completed by other users; starts at `quantity` and
    // is decremented as task completions get approved.
    remainingSlots: integer("remaining_slots").notNull(),

    // The generated task other users complete to fulfil this campaign.
    // Nullable only because it's set right after the linked task row is
    // inserted (both rows reference each other).
    taskId: uuid("task_id").references((): AnyPgColumn => tasks.id, {
      onDelete: "set null",
    }),

    status: adStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("ads_user_idx").on(table.userId),
    statusIdx: index("ads_status_idx").on(table.status),
    taskIdx: index("ads_task_idx").on(table.taskId),
  }),
);

export type Ad = typeof ads.$inferSelect;
