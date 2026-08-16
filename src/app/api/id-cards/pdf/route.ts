import { readFileSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getRolePerms, hasPerm } from "@/lib/permissions";
import { getSchool } from "@/lib/school";
import { getIdCardDesign } from "@/lib/id-card-builder";
import { buildIdCardPdf, type IdCardPdfPerson } from "@/lib/id-card-pdf";

const DEV = { name: "shacomputec", email: "shacomputecgh@gmail.com", tel: "+233 530 941 750" };

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "id-cards";
}

/** Load the tiny developer logo for the card header (best-effort). */
function loadLogo(): Buffer | null {
  try {
    const p = path.join(process.cwd(), "public", "sms-logo.png");
    return readFileSync(p);
  } catch {
    return null;
  }
}

/**
 * Download real ID card PDFs — one A4 page per person (card front + back).
 *   GET /api/id-cards/pdf?kind=students&classId=<id>
 *   GET /api/id-cards/pdf?kind=staff
 * Session-gated like the on-screen print pages.
 */
export const GET = handle(async (req: Request) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);
  const perms = await getRolePerms(user.roleId);
  if (!hasPerm(perms, "students", "read")) throw new ApiError("You do not have permission to view ID cards", 403);

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "students";
  const classId = url.searchParams.get("classId");

  const [design, school] = await Promise.all([getIdCardDesign(), getSchool()]);

  const headerTitle = design.headerText.trim() || school?.name || "School";
  const footerText = design.footerText.trim() || `Powered by ${DEV.name} · ${DEV.tel} · ${DEV.email}`;
  const contact = [school?.phone, school?.email].filter(Boolean).join(" ").trim();

  const origin = `${url.protocol}//${url.host}`;
  const qrModules = (text: string) => QRCode.create(text, { errorCorrectionLevel: "M" }).modules;

  let people: IdCardPdfPerson[];
  let filename: string;
  let accentLabel: string;
  let headerSub: string;

  if (kind === "staff") {
    const teachers = await prisma.teacher.findMany({ where: { status: "ACTIVE" }, orderBy: { fullName: "asc" } });
    if (!teachers.length) throw new ApiError("No active staff members found", 404);
    accentLabel = "Staff Identity Card";
    headerSub = design.subtitleText.trim() || "STAFF IDENTITY CARD";
    filename = `Staff-ID-Cards-${slug(school?.name ?? "school")}.pdf`;
    people = teachers.map((t) => ({
      id: t.id,
      name: t.fullName,
      photo: t.photo,
      frontLines: [
        design.front.admissionNo ? `Staff ID: ${t.staffId}` : "",
        `Rank: ${t.rank || "—"}`,
        `Grade: ${t.gradeLevel || t.gradeType || "—"}`,
        `Main subject: ${t.mainSubject || "—"}`,
      ].filter(Boolean),
      backRows: [
        ...(design.back.phone ? [{ label: "Phone", value: t.phone || "—" }] : []),
        ...(design.back.nationality ? [{ label: "Email", value: t.email || "—" }] : []),
        ...(design.back.hometown ? [{ label: "Home Town", value: t.hometown || "—" }] : []),
        ...(design.back.region ? [{ label: "Region", value: t.region || "—" }] : []),
        ...(design.back.idNo ? [{ label: "Ghana Card", value: t.ghanaCard || "—" }] : []),
        ...(design.back.dob ? [{ label: "NTC / RED", value: t.ntcReg || "—" }] : []),
      ],
      qrText: design.back.qr ? `${origin}/` : null,
      qrHint: "Scan the code to visit the school website.",
      contact,
      accentLabel: "Staff Identity Card",
    }));
  } else {
    if (!classId) throw new ApiError("A class is required for student ID cards", 422);
    const klass = await prisma.class.findUnique({ where: { id: classId }, include: { level: true } });
    if (!klass) throw new ApiError("Class not found", 404);
    const [students, currentYear] = await Promise.all([
      prisma.student.findMany({ where: { classId, status: "ACTIVE" }, orderBy: { fullName: "asc" } }),
      prisma.academicYear.findFirst({ where: { isCurrent: true } }),
    ]);
    if (!students.length) throw new ApiError("This class has no active students", 404);

    accentLabel = "Student Identity Card";
    headerSub = design.subtitleText.trim() || `${klass.level?.name ?? ""} · ${klass.name}`;
    filename = `Student-ID-Cards-${slug(klass.name)}.pdf`;
    people = students.map((s) => ({
      id: s.id,
      name: s.fullName,
      photo: s.photo,
      frontLines: [
        design.front.classLine ? `Class: ${klass.name}` : "",
        design.front.admissionNo ? `Admission No: ${s.admissionNo}` : "",
        design.front.year ? `Academic Year: ${currentYear?.name ?? "—"}` : "",
        design.front.gender ? `Gender: ${s.gender === "FEMALE" ? "Female" : "Male"}` : "",
      ].filter(Boolean),
      backRows: [
        ...(design.back.idNo ? [{ label: "NHIS / ID No", value: s.nhisNumber || s.ghanaCard || "—" }] : []),
        ...(design.back.dob ? [{ label: "Date of Birth", value: fmtDate(s.dateOfBirth) }] : []),
        ...(design.back.hometown ? [{ label: "Home Town", value: s.hometown || "—" }] : []),
        ...(design.back.region ? [{ label: "Region", value: s.region || "—" }] : []),
        ...(design.back.phone ? [{ label: "Phone", value: s.phone || "—" }] : []),
        ...(design.back.nationality ? [{ label: "Nationality", value: s.nationality || "Ghanaian" }] : []),
      ],
      qrText: design.back.qr ? `${origin}/result-checker` : null,
      qrHint: "Scan the code to check results on the Result Checker portal.",
      contact,
      accentLabel: "Student Identity Card",
    }));
  }

  const buf = buildIdCardPdf({
    design: {
      headerBg: design.headerBg,
      headerTextColor: design.headerTextColor,
      accent: design.accent,
      headerTitle,
      headerSub,
      footerText,
      front: { ...design.front },
      back: { ...design.back },
    },
    people,
    logoPng: design.showLogo ? loadLogo() : null,
    qrModules,
  });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buf.length),
    },
  });
});
