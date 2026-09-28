import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const studyStateTable = pgTable("study_state", {
  id: text("id").primaryKey(),
  state: jsonb("state").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type StudyStateRecord = typeof studyStateTable.$inferSelect;