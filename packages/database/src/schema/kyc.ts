import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { kycDocumentStatusEnum, kycDocumentTypeEnum } from "./enums";

import { users } from "./users";

export const kycDocuments = pgTable(
  "kyc_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    documentType: kycDocumentTypeEnum("document_type").notNull(),

    documentNumber: varchar("document_number", {
      length: 100,
    }),

    documentUrl: text("document_url").notNull(),

    status: kycDocumentStatusEnum("status").notNull().default("pending"),

    reviewNote: text("review_note"),

    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),

    reviewedAt: timestamp("reviewed_at", {
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
    userIdx: index("kyc_documents_user_idx").on(table.userId),

    statusIdx: index("kyc_documents_status_idx").on(table.status),
  }),
);

export type KycDocument = typeof kycDocuments.$inferSelect;

export type NewKycDocument = typeof kycDocuments.$inferInsert;
