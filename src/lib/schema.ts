import { sql } from "drizzle-orm";
import { int, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export type Day = (typeof DAYS)[number];

export const courses = sqliteTable("courses", {
  id: int().primaryKey({ autoIncrement: true }),
  code: text().notNull(),
  name: text().notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: int().primaryKey({ autoIncrement: true }),
  courseId: int("course_id")
    .notNull()
    .references(() => courses.id),
  label: text().notNull(),
  day: text().notNull().$type<Day>(),
  startHour: int("start_hour").notNull(),
  endHour: int("end_hour").notNull(),
  location: text().notNull(),
});

// One selection per course: picking a new session for a course you've
// already got a selection for replaces it (see selectSession in db.ts).
// This is the DB-level guarantee a course can't have two chosen sessions.
export const selections = sqliteTable(
  "selections",
  {
    id: int().primaryKey({ autoIncrement: true }),
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id),
    sessionId: int("session_id")
      .notNull()
      .references(() => sessions.id),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [unique().on(table.courseId)],
);

export type Course = typeof courses.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Selection = typeof selections.$inferSelect;
