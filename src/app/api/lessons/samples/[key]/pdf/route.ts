import { NextResponse } from "next/server";
import { handle, ApiError } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { getSchool } from "@/lib/school";
import { findSample } from "@/lib/lesson-samples";
import { buildLessonNotePdf } from "@/lib/lesson-note-pdf";

const DEV = { name: "shacomputec", email: "shacomputecgh@gmail.com", tel: "+233 530 941 750" };

function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "lesson-note";
}

/**
 * Download a single sample lesson note as a GES/NaCCA-format PDF.
 *   GET /api/lessons/samples/<key>/pdf
 */
export const GET = handle(async (_req: Request, { params }: { params: Record<string, string> }) => {
  await requirePerm("lessons", "read");

  const sample = await findSample(params.key);
  if (!sample) throw new ApiError("Sample lesson note not found", 404);

  const school = await getSchool();
  const pdf = buildLessonNotePdf({
    schoolName: school?.name ?? "Ghana Education Service",
    schoolMotto: school?.motto,
    subject: sample.subject,
    level: sample.level,
    topic: sample.topic,
    week: sample.week,
    duration: sample.duration,
    objectives: sample.objectives,
    resources: sample.resources,
    activityIntro: sample.activityIntro,
    activityMain: sample.activityMain,
    activityPlenary: sample.activityPlenary,
    homework: sample.homework,
    developerName: DEV.name,
    developerPhone: DEV.tel,
    developerEmail: DEV.email,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Lesson-Note-${slug(sample.subject)}-${slug(sample.topic).slice(0, 48)}.pdf"`,
    },
  });
});
