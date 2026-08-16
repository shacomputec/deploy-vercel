import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { aiReportComment } from "@/lib/ai/report-comment";
import type { ComputedReport } from "@/lib/report";

/**
 * Suggest an AI-written teacher's comment for a report card. The suggestion is
 * returned (not saved) — the teacher reviews/edits it and saves with the usual
 * comment-save flow. Works offline out of the box (rule-based); when AI_MODE=
 * openai + OPENAI_API_KEY are set it uses the configured LLM with automatic
 * fallback.
 */
export const POST = handle(async (req, { params }) => {
  await requirePerm("reports", "publish");

  const report = await prisma.reportCard.findUnique({
    where: { id: params.id },
    include: { student: true, term: true, academicYear: true, class: true },
  });
  if (!report) throw new ApiError("Report not found", 404);

  const body = await readJson<{ conduct?: string | null }>(req).catch(() => null);
  const data = report.data ? (JSON.parse(report.data) as ComputedReport) : null;
  if (!data) throw new ApiError("Report has no computed data yet — generate the report card first.", 422);

  const comment = await aiReportComment(data, body?.conduct ?? report.conduct);
  return ok({ comment });
});
