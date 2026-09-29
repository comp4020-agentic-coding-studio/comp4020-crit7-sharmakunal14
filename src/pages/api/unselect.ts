import type { APIRoute } from "astro";
import { unselectCourse } from "../../lib/db";
import { bus } from "../../lib/events";

// Lets a student clear a course's selection outright, rather than only ever
// swapping it for a different session. Same form-POST-plus-303 shape as
// /api/select, so it works with no client-side JavaScript.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const courseId = Number(form.get("courseId"));
  if (!Number.isInteger(courseId)) {
    return redirect("/", 303);
  }

  unselectCourse(courseId);
  bus.emit("selection", courseId);
  return redirect("/", 303);
};
