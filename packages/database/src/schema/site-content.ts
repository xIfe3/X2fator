import { jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Landing-page copy, editable by admins in /admin/site-content and
// rendered on the public homepage. One row per section — 'hero',
// 'features', 'about', 'contact', 'legal' — each holding a free-form
// JSON blob so the frontend can shape it however that section needs
// without further schema changes.
export const siteContent = pgTable("site_content", {
  section: varchar("section", {
    length: 50,
  }).primaryKey(),

  content: jsonb("content").notNull().default({}),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export type SiteContent = typeof siteContent.$inferSelect;
export type NewSiteContent = typeof siteContent.$inferInsert;
