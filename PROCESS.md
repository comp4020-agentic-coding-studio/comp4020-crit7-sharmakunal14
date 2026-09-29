# Process overview

## What I built

The one clash-avoidance chunk of ANU's MyTimetable: pick a tutorial/lab
session per course from a fixed catalogue, and the app rejects a pick that
overlaps a session you've already chosen for another course. `README.md`
covers what "good" means here in more depth.

## How I got here

I started from the `template-dynamic` starter
([`dcb7f1f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-sharmakunal14/commit/dcb7f1f25564d35d730a92ffe2bb2b9c546800a2))
and asked for a plan before touching code, since the brief ("build the ANU
system you wish existed") was open enough to drift into scope I didn't want:

> what i mean is that timetabling for students at mytimetable, i wanna
> rebuild that small chunk of it.

From the approved plan, the guestbook starter was replaced end to end in three
commits: schema first
([`144bf18`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-sharmakunal14/commit/144bf18aaaf36527b6e80d7518f3c4ceb5efd5b3)) —
`courses`/`sessions`/`selections`, with a `unique()` constraint on
`selections.course_id` so "one selection per course" is a database invariant,
not UI discipline — then the backend
([`f31539d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-sharmakunal14/commit/f31539d12106376754b303dcb667b5fd9d580468)),
where the clash check (`overlaps`) and the write happen inside one
`db.transaction()` in `selectSession`, then the frontend and README
([`e3426bc`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-sharmakunal14/commit/e3426bc63753253742a76c33018c1c2a409f9b95)).

I didn't take the clash logic on faith. The seed data in `src/lib/db.ts` was
written with a deliberate clash built in (COMP1010 and COMP2100 both offer a
Mon 10–11 tutorial), and `spec/timetable.test.ts`
([`b2f1284`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-sharmakunal14/commit/b2f128487ec6997c5cd29dbb9aa78bdee1b0b1dc))
drives the built app over HTTP to check three things the plan named as the
actual claims of the feature: a selection persists across a reload, a
clashing pick is rejected without disturbing the existing selection, and
picking a different session for a course you've already chosen replaces the
old pick instead of adding a second row. All three also passed manually
against the deployed app at `https://comp4020-crit7-sharmakunal14.fly.dev/`
after `flyctl deploy`, by POSTing to `/api/select` directly and checking the
redirect and the reloaded page.

`pnpm check` (typecheck + build + the full spec suite, run through `mise exec`
so it uses the pinned Node 24 rather than the system default) was green
before each commit.

## Before you ship

Verified: `pnpm check:evidence` passes, citations above resolve to commits on
`main` in this repo, and `reflections/crit-7.md` exists.
