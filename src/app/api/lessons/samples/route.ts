import { handle, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { LESSON_SAMPLES, dbSamples } from "@/lib/lesson-samples";

/** GET /api/lessons/samples?level=&subject=&q= — the sample library (built-in
 *  notes plus anything the developer uploaded from the dev console). */
export const GET = handle(async (req) => {
  await requirePerm("lessons", "read");
  const url = new URL(req.url);
  const level = url.searchParams.get("level") ?? "";
  const subject = url.searchParams.get("subject") ?? "";
  const q = url.searchParams.get("q") ?? "";
  const uploaded = await dbSamples();
  let list = [...LESSON_SAMPLES, ...uploaded];
  if (level) {
    const band = level.toLowerCase();
    list = list.filter(
      (s) =>
        s.level.toLowerCase().includes(band) ||
        (band.includes("primary") && s.level.toLowerCase().startsWith("primary")) ||
        (band.includes("jhs") && s.level.toLowerCase().startsWith("jhs")) ||
        (band.includes("shs") && s.level.toLowerCase().startsWith("shs")) ||
        (band.includes("kg") && s.level.toLowerCase().startsWith("kg")) ||
        (band.includes("creche") && s.level.toLowerCase().startsWith("kg"))
    );
  }
  if (subject) list = list.filter((s) => s.subject === subject);
  if (q) {
    const t = q.toLowerCase();
    list = list.filter(
      (s) => s.topic.toLowerCase().includes(t) || s.subject.toLowerCase().includes(t) || s.level.toLowerCase().includes(t)
    );
  }
  const subjects = [...new Set([...LESSON_SAMPLES, ...uploaded].map((s) => s.subject))].sort();
  return ok({ samples: list, subjects });
});
