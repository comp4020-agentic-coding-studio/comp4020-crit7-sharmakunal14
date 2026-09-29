import { beforeAll, describe, expect, inject, it } from "vitest";

// Drives the running app over HTTP to prove the crit's actual claims hold in
// THIS repo: a selection persists across a reload, a clashing selection is
// rejected and doesn't disturb what's already chosen, and picking a new
// session for a course you've already chosen replaces the old one.
//
// Session ids below rely on the deterministic seed order in src/lib/db.ts
// (each test run boots against a fresh, empty database — see
// global-setup.ts): COMP1010 gets sessions 1 (Tutorial 1, Mon 10-11) and 2
// (Tutorial 2, Mon 14-15); COMP2100 gets 3 (Tutorial 1, Mon 10-11 — clashes
// with COMP1010's Tutorial 1) and 4 (Tutorial 2, Wed 11-12).
const baseUrl = inject("baseUrl");

describe("timetable", () => {
  // Astro checks form POSTs carry a same-origin Origin header (CSRF
  // protection); browsers send it automatically, a bare fetch doesn't.
  const select = (sessionId: number) =>
    fetch(new URL("/api/select", baseUrl), {
      method: "POST",
      headers: { origin: baseUrl },
      body: new URLSearchParams({ sessionId: String(sessionId) }),
      redirect: "manual",
    });

  beforeAll(async () => {
    // establish a known starting point: COMP1010's Tutorial 1 selected
    const res = await select(1);
    expect(res.status).toBe(303);
  });

  it("persists a selection: a fresh page load shows it in the grid", async () => {
    const page = await fetch(baseUrl).then((r) => r.text());
    expect(page).toContain("COMP1010");
    expect(page).toContain("Tutorial 1");
  });

  it("rejects a session that clashes with another course's selection", async () => {
    const res = await select(3); // COMP2100 Tutorial 1, same Mon 10-11 slot
    expect(res.status).toBe(303);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("error=clash");
    expect(location).toContain("with=COMP1010");

    // the original selection is untouched
    const page = await fetch(baseUrl).then((r) => r.text());
    expect(page).toContain("COMP1010");
  });

  it("replaces a course's own prior selection instead of rejecting it", async () => {
    const res = await select(2); // COMP1010 Tutorial 2 — same course as Tutorial 1
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");

    const page = await fetch(baseUrl).then((r) => r.text());
    expect(page).toContain("Tutorial 2");
    // the earlier Tutorial 1 pick for COMP1010 is gone, replaced not duplicated
    expect(page).not.toMatch(/✓ Tutorial 1/);
  });
});
