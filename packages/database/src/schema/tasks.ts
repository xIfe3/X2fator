import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { taskCompletionStatusEnum, taskStatusEnum } from "./enums";

import { users } from "./users";
import { planSubscriptions } from "./subscriptions";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    title: varchar("title", {
      length: 255,
    }).notNull(),

    description: text("description"),

    reward: numeric("reward", {
      precision: 18,
      scale: 2,
    }).notNull(),

    durationSeconds: integer("duration_seconds"),

    // What kind of task this is — drives which link/label the frontend
    // shows ('video' -> "Watch video", 'app' -> "Get the app", etc).
    taskType: varchar("task_type", {
      length: 20,
    })
      .notNull()
      .default("other"),

    // The link the user is sent to complete the task (video URL, app
    // store link, etc). Optional — some tasks may not need one.
    targetUrl: text("target_url"),

    status: taskStatusEnum("status").notNull().default("active"),

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
    statusIdx: index("tasks_status_idx").on(table.status),
  }),
);

export const taskCompletions = pgTable(
  "task_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
      }),

    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, {
        onDelete: "restrict",
      }),

    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => planSubscriptions.id, {
        onDelete: "restrict",
      }),

    reward: numeric("reward", {
      precision: 18,
      scale: 2,
    }).notNull(),

    submissionData: jsonb("submission_data"),

    screenshotUrl: text("screenshot_url"),

    status: taskCompletionStatusEnum("status").notNull().default("pending"),

    completedAt: timestamp("completed_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),

    reviewedAt: timestamp("reviewed_at", {
      withTimezone: true,
    }),

    rejectionReason: text("rejection_reason"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("task_completions_user_idx").on(table.userId),

    taskIdx: index("task_completions_task_idx").on(table.taskId),

    subscriptionIdx: index("task_completions_subscription_idx").on(
      table.subscriptionId,
    ),

    statusIdx: index("task_completions_status_idx").on(table.status),

    completedAtIdx: index("task_completions_completed_at_idx").on(
      table.completedAt,
    ),
  }),
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type NewTaskCompletion = typeof taskCompletions.$inferInsert;
