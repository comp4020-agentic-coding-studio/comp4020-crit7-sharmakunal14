import type { APIRoute } from "astro";
import { selectSession } from "../../lib/db";
import { bus } from "../../lib/events";

// The write half of the app: a plain HTML form POSTs a sessionId here. On a
// clash the redirect carries the reason so the page can show it; the 303
// redirect either way makes the form work with no client-side JavaScript —
// the submitting tab re-renders from the database; every *other* tab hears
// about a successful selection over the SSE stream.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const sessionId = Number(form.get("sessionId"));
  if (!Number.isInteger(sessionId)) {
    return redirect("/", 303);
  }

  const result = selectSession(sessionId);
  if (!result.ok) {
    const params = new URLSearchParams({
      error: "clash",
      with: result.withCourse,
      attempted: String(sessionId),
    });
    return redirect(`/?${params}`, 303);
  }

  bus.emit("selection", sessionId);
  return redirect("/", 303);
};
