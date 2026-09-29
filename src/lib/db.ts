import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  type Course,
  type Day,
  type Session,
  courses,
  selections,
  sessions,
} from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

export type { Course, Session };

// The course catalogue is seeded, fixed data — modeling "which sessions
// exist" isn't the point of this slice, choosing a clash-free one is. Seed
// once, on an empty database, so a redeploy never duplicates it.
if (db.select().from(courses).all().length === 0) {
  const seed: {
    code: string;
    name: string;
    options: { label: string; day: Day; startHour: number; endHour: number; location: string }[];
  }[] = [
    {
      code: "COMP1010",
      name: "Foundations of Computing",
      options: [
        { label: "Tutorial 1", day: "Mon", startHour: 10, endHour: 11, location: "Ian Ross G029" },
        { label: "Tutorial 2", day: "Mon", startHour: 14, endHour: 15, location: "Ian Ross G029" },
      ],
    },
    {
      code: "COMP2100",
      name: "Software Design Methodologies",
      options: [
        { label: "Tutorial 1", day: "Mon", startHour: 10, endHour: 11, location: "Hayden Allen 1.02" },
        { label: "Tutorial 2", day: "Wed", startHour: 11, endHour: 12, location: "Hayden Allen 1.02" },
      ],
    },
    {
      code: "COMP3120",
      name: "Introduction to Theoretical Computer Science",
      options: [
        { label: "Lab 1", day: "Wed", startHour: 11, endHour: 12, location: "CSIT N101" },
        { label: "Lab 2", day: "Thu", startHour: 15, endHour: 16, location: "CSIT N101" },
      ],
    },
    {
      code: "COMP4020",
      name: "Agentic Coding Studio",
      options: [
        { label: "Studio 1", day: "Wed", startHour: 9, endHour: 11, location: "Marie Reay 4.03" },
        { label: "Studio 2", day: "Thu", startHour: 14, endHour: 16, location: "Marie Reay 4.03" },
      ],
    },
  ];

  for (const { code, name, options } of seed) {
    const course = db.insert(courses).values({ code, name }).returning().get();
    for (const option of options) {
      db.insert(sessions)
        .values({ courseId: course.id, ...option })
        .run();
    }
  }
}

export type CourseWithSessions = Course & {
  options: Session[];
  selectedSessionId: number | null;
};

export function listCoursesWithSessions(): CourseWithSessions[] {
  const allCourses = db.select().from(courses).orderBy(asc(courses.code)).all();
  const allSessions = db.select().from(sessions).all();
  const allSelections = db.select().from(selections).all();

  return allCourses.map((course) => ({
    ...course,
    options: allSessions
      .filter((s) => s.courseId === course.id)
      .sort((a, b) => a.label.localeCompare(b.label)),
    selectedSessionId:
      allSelections.find((sel) => sel.courseId === course.id)?.sessionId ?? null,
  }));
}

// The current timetable: every selected session, joined with its course.
export function listSelectedSessions(): (Session & { course: Course })[] {
  const rows = db
    .select()
    .from(selections)
    .innerJoin(sessions, eq(selections.sessionId, sessions.id))
    .innerJoin(courses, eq(selections.courseId, courses.id))
    .all();
  return rows.map((row) => ({ ...row.sessions, course: row.courses }));
}

function overlaps(a: { day: string; startHour: number; endHour: number }, b: typeof a) {
  return a.day === b.day && a.startHour < b.endHour && b.startHour < a.endHour;
}

export type SelectResult =
  | { ok: true }
  | { ok: false; reason: "clash"; withCourse: string };

// Pick `sessionId` for its course. Rejects if it overlaps a session already
// selected for a *different* course; replaces this course's own prior
// selection (no clash with yourself) rather than rejecting it. Runs as one
// transaction so a clash check never races a concurrent selection.
export function selectSession(sessionId: number): SelectResult {
  return db.transaction((tx) => {
    const session = tx.select().from(sessions).where(eq(sessions.id, sessionId)).get();
    if (!session) {
      throw new Error(`no such session: ${sessionId}`);
    }

    const others = tx
      .select()
      .from(selections)
      .innerJoin(sessions, eq(selections.sessionId, sessions.id))
      .innerJoin(courses, eq(selections.courseId, courses.id))
      .all()
      .filter((row) => row.selections.courseId !== session.courseId);

    const clash = others.find((row) => overlaps(session, row.sessions));
    if (clash) {
      return { ok: false, reason: "clash", withCourse: clash.courses.code } as const;
    }

    tx.delete(selections).where(eq(selections.courseId, session.courseId)).run();
    tx.insert(selections).values({ courseId: session.courseId, sessionId: session.id }).run();
    return { ok: true } as const;
  });
}

// Clears a course's selection, if it has one. Not an error to call this on a
// course with nothing selected — it's just a no-op delete.
export function unselectCourse(courseId: number): void {
  db.delete(selections).where(eq(selections.courseId, courseId)).run();
}
