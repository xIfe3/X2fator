import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { plans } from "./plans";
import { tasks } from "./tasks";

export const planTasks = pgTable(
  "plan_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, {
        onDelete: "cascade",
      }),

    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    planIdx: index("plan_tasks_plan_idx").on(table.planId),

    taskIdx: index("plan_tasks_task_idx").on(table.taskId),

    planTaskUnique: uniqueIndex("plan_tasks_plan_task_unique").on(
      table.planId,
      table.taskId,
    ),
  }),
);

export type PlanTask = typeof planTasks.$inferSelect;
export type NewPlanTask = typeof planTasks.$inferInsert;
