// Report-card comment generator.
//
// Works offline out of the box: a deterministic, GES-style comment is built
// from the student's actual report data (totals, best/weakest subjects,
// position, attendance, conduct). When AI_MODE=openai + OPENAI_API_KEY are
// set, the same data is sent to the LLM for a natural-language comment, with
// the offline generator as the automatic fallback.
import type { ComputedReport } from "@/lib/report";

const FIRST_NAME = (fullName: string) => fullName.split(/\s+/)[0] ?? fullName;

/** Deterministic, offline comment builder — always available, no API needed. */
export function localReportComment(rep: ComputedReport, conduct?: string | null): string {
  const name = FIRST_NAME(rep.student.fullName);
  const scored = rep.results.filter((r) => r.total !== null);
  const total = rep.totalPercent;
  const position = rep.position;
  const onRoll = rep.onRoll;

  if (scored.length === 0) {
    return `${name} is a pleasant member of ${rep.className}. Once assessment scores are entered, a detailed comment with strengths and areas to improve will be provided.`;
  }

  const passed = scored.filter((r) => r.passed).length;
  const best = [...scored].sort((a, b) => (b.total ?? 0) - (a.total ?? 0))[0];
  const weakest = [...scored].sort((a, b) => (a.total ?? 0) - (b.total ?? 0))[0];
  const strongest = best?.total !== null && (best?.total ?? 0) >= 55;
  const attendanceRate = rep.attendanceDays > 0 ? Math.round((rep.attendancePresent / rep.attendanceDays) * 100) : 100;

  let band: string;
  if (total >= 80) band = "an outstanding term — a consistently excellent performance across subjects";
  else if (total >= 70) band = "a very good term, showing strong understanding and steady progress";
  else if (total >= 55) band = "a satisfactory term with solid effort and clear potential to do even better";
  else if (total >= 40) band = "a fair term — improvement is needed, especially with consistent practice and homework";
  else band = "a challenging term academically; extra support at home and school is encouraged";

  const parts: string[] = [`${name} has had ${band}.`];

  if (scored.length > 1 && best && weakest) {
    parts.push(
      `${strongest ? `${name} shows a particular strength in ${best.subject}` : `${name}'s best performance was in ${best.subject}`}, while ${weakest.subject} will benefit from more practice and attention.`
    );
  }
  if (passed < scored.length) {
    parts.push(`A total of ${passed} of ${scored.length} subjects were passed this term.`);
  }
  if (position && onRoll) {
    parts.push(`${name} placed ${ordinal(position)} out of ${onRoll} in ${rep.className}.`);
  }
  if (conduct && conduct !== "GOOD" && conduct !== "EXCELLENT" && conduct !== "VERY GOOD") {
    parts.push(`Conduct was marked ${conduct.toLowerCase()} — the class teacher will be working with ${name} on behaviour in the coming term.`);
  } else if (attendanceRate < 85) {
    parts.push(`Attendance (${attendanceRate}%) should improve to keep up with the pace of the class.`);
  } else if (total >= 70) {
    parts.push(`Attendance was regular and ${name} participates confidently in class activities.`);
  }

  parts.push("Keep working hard, and aim even higher next term.");
  return parts.join(" ");
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Prefer the configured LLM when available; always falls back to offline. */
export async function aiReportComment(rep: ComputedReport, conduct?: string | null): Promise<string> {
  const mode = (process.env.AI_MODE || "offline").toLowerCase();
  const local = localReportComment(rep, conduct);
  if (mode !== "openai") return local;

  const key = process.env.OPENAI_API_KEY;
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!key) return local;

  const summary = {
    student: rep.student.fullName,
    class: rep.className,
    level: rep.levelCode,
    term: rep.termName,
    totalPercent: rep.totalPercent,
    position: rep.position,
    onRoll: rep.onRoll,
    attendance: `${rep.attendancePresent}/${rep.attendanceDays}`,
    conduct: conduct ?? "GOOD",
    promotion: rep.promotionStatus,
    subjects: rep.results.map((r) => ({ subject: r.subject, total: r.total, grade: r.grade, passed: r.passed })),
  };
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You write warm, professional end-of-term report comments for a Ghanaian school (GES style). " +
              "Write exactly 2–3 sentences addressed to the parents about their child. Mention one strength, " +
              "one area to improve, and end with encouragement. Use the child's first name. Never invent scores.",
          },
          { role: "user", content: `Write the teacher's comment from this data:\n${JSON.stringify(summary)}` },
        ],
        max_tokens: 220,
      }),
    });
    if (!res.ok) throw new Error(`AI provider error ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const out = json.choices?.[0]?.message?.content?.trim();
    return out && out.length > 0 ? out : local;
  } catch (err) {
    console.error("[ai-report-comment]", err);
    return local;
  }
}
