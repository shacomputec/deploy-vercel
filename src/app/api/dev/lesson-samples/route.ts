import { handle, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { dbSampleToSample } from "@/lib/lesson-samples";

const requireDeveloper = async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  if (user.role.name !== "developer") throw { status: 403, message: "Developer only" };
  return user;
};

type SampleBody = {
  level?: string;
  subject?: string;
  topic?: string;
  week?: number | string;
  duration?: string;
  objectives?: string;
  resources?: string;
  activityIntro?: string;
  activityMain?: string;
  activityPlenary?: string;
  homework?: string;
};

/**
 * GET /api/dev/lesson-samples — every developer-uploaded sample lesson note.
 * POST /api/dev/lesson-samples — upload a new sample (class level + subject +
 * topic + NaCCA lesson-plan fields). Stored as LessonNote rows with
 * isSample=true so teachers see them in the sample library immediately.
 */
export const GET = handle(async () => {
  await requireDeveloper();
  const rows = await prisma.lessonNote.findMany({
    where: { isSample: true },
    orderBy: { createdAt: "desc" },
  });
  return ok({ samples: rows.map(dbSampleToSample) });
});

export const POST = handle(async (req) => {
  const user = await requireDeveloper();
  const body = await readJson<SampleBody>(req);
  const level = (body.level ?? "").trim();
  const subject = (body.subject ?? "").trim();
  const topic = (body.topic ?? "").trim();
  if (!level || !subject || !topic) {
    throw { status: 400, message: "Class level, subject and topic are required" };
  }

  const row = await prisma.lessonNote.create({
    data: {
      isSample: true,
      sampleLevel: level,
      sampleSubject: subject,
      topic,
      week: body.week ? Number(body.week) : 1,
      duration: body.duration?.trim() || null,
      objectives: body.objectives?.trim() || null,
      resources: body.resources?.trim() || null,
      activityIntro: body.activityIntro?.trim() || null,
      activityMain: body.activityMain?.trim() || null,
      activityPlenary: body.activityPlenary?.trim() || null,
      homework: body.homework?.trim() || null,
      status: "DRAFT",
    },
  });
  await auditLog(user.id, "CREATE", "lessons", row.id, { topic: row.topic, source: "developer-sample" });
  return ok({ sample: dbSampleToSample(row) }, { status: 201 });
});
