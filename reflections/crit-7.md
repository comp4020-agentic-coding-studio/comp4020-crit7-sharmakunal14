# Crit 7 reflection

**What was the breakthrough that moved the work forward?**

Rejecting my own first idea. I opened with a generic "room booking" concept
because it felt safely scoped, but it wasn't actually the ANU system I
wished existed — it was a system shaped to be easy to plan. Naming the real
one (MyTimetable's clash check) forced a smaller, sharper plan: one
constraint, enforced in one transaction, proven by three HTTP-level tests
instead of a pile of half-relevant CRUD. The scope got smaller and the work
got more honest at the same time.

**What did this work change about who I want to be as a software developer?**

I noticed I was tempted to trust the clash logic because it read cleanly, not
because I'd checked it. Writing a deliberate clash into the seed data and
watching `spec/timetable.test.ts` actually reject it — then repeating that
same sequence by hand against the live Fly deployment — was the difference
between "this looks right" and "this is right." I want to keep defaulting to
that: prove the specific claim I'm making, against the running thing, not
just against the code that's supposed to produce it.
