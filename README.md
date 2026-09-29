# My Timetable, one small chunk of it

ANU's MyTimetable lets you pick which tutorial or lab session you want for
each enrolled course, and stops you picking two that overlap in time. This
is that one job, built end to end: a fixed set of courses, each with a
handful of session options; pick one per course; the app rejects a pick
that clashes with a session you've already chosen for another course, and
your picks build up into a weekly grid that survives a reload.

## What good looks like here

- **The clash rule is enforced, not just suggested.** `selectSession` in
  `src/lib/db.ts` checks every other course's current selection for a
  time overlap before writing, inside a transaction — the check and the
  write can't be raced apart. `spec/timetable.test.ts` drives this over
  HTTP: a clashing pick is rejected, and the original selections are
  unchanged.
- **A course has at most one selection.** That's a database constraint
  (`selections.course_id` is unique, see `src/lib/schema.ts`), not just UI
  discipline — picking a new session for a course you've already chosen
  replaces the old one, rather than adding a second row.
- **Picks persist across a reload.** They're written to SQLite on the
  machine's volume, the same as the starter's guestbook; `spec/timetable.test.ts`
  checks a fresh page load still shows a selection made earlier.
- **A clash is highlighted, not just named.** A rejected pick redirects with
  both sides of the clash in the URL, so the page can outline the course
  card you already hold that slot in and the option you just tried, on top
  of the alert banner.
- **A course's selection can be cleared outright**, not just swapped. Every
  course with a current pick shows an "Unselect" button (`POST /api/unselect`),
  freeing that slot — useful when the fix for a clash is to drop a pick
  rather than move it.

## What's a deliberate cut, not an oversight

- **No accounts.** There's one shared timetable, like the starter's
  guestbook was one shared message list — building login wasn't the point
  of this slice.
- **The course catalogue is fixed, seeded data.** Real MyTimetable models
  enrolment separately; here the four courses and their session options
  are seeded once and aren't editable.
- **Only tutorials/labs are modeled**, not lectures (usually fixed, no
  choice to make) or capacity/waitlists.
