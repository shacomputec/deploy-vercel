import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { nextAdmissionNo } from "@/lib/sequences";
import { notifyRoleInApp, notify } from "@/lib/notify";
import { buildAdmissionOfferPdf } from "@/lib/offer-pdf";
import { getSchool } from "@/lib/school";
import { fmtDate } from "@/lib/utils";

/**
 * APPROVE an application → auto-create the student, pre-enrolled in the exact
 * class they applied for (with the parent linked). Idempotent: approving twice
 * never duplicates the student — the first approval links the application to
 * the student it created, and later approvals simply return that same student.
 */
export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("admissions", "update");
  const body = (await req.json()) as { status?: string };
  const status = body.status;

  const found = await prisma.admissionApplication.findUnique({
    where: { id: params.id },
    include: { level: true, class: true },
  });
  if (!found) throw new ApiError("Application not found", 404);
  // Snapshot for closures — `app` below is reassigned later, which widens the
  // type back to nullable inside the transaction callback.
  const application = found;

  let createdStudent = false;

  if (status === "APPROVED" && !application.studentId) {
    // Everything in one transaction so a crash can't half-enroll.
    const { student } = await prisma.$transaction(async (tx) => {
      const admissionNo = await nextAdmissionNo();
      const student = await tx.student.create({
        data: {
          admissionNo,
          fullName: application.fullName,
          gender: application.gender ?? "MALE",
          dateOfBirth: application.dateOfBirth ?? null,
          classId: application.classId ?? null,
          nhisNumber: application.nhisNumber ?? null,
          address: application.address ?? null,
          status: "ACTIVE",
        },
      });

      // Pre-enroll in the current academic year + the exact class applied for.
      const year = await tx.academicYear.findFirst({ where: { isCurrent: true } });
      if (application.classId && year) {
        await tx.enrollment.create({
          data: { studentId: student.id, classId: application.classId, academicYearId: year.id },
        });
      }

      // Link (or reuse) the parent from the application's contact details.
      if (application.parentPhone) {
        let parent = await tx.parent.findUnique({ where: { phone: application.parentPhone } });
        if (!parent) {
          parent = await tx.parent.create({
            data: {
              fullName: application.parentName,
              phone: application.parentPhone,
              email: application.parentEmail ?? null,
              occupation: application.parentOccupation ?? null,
              address: application.address ?? null,
            },
          });
        }
        await tx.studentParent.upsert({
          where: { studentId_parentId: { studentId: student.id, parentId: parent.id } },
          update: {},
          create: { studentId: student.id, parentId: parent.id, isPrimary: true },
        });
      }

      await tx.admissionApplication.update({
        where: { id: params.id },
        data: { status: "APPROVED", studentId: student.id },
      });

      return { student };
    });

    createdStudent = true;
    await auditLog(user.id, "CREATE", "students", student.id, {
      fromAdmission: application.referenceNo,
      name: student.fullName,
      admissionNo: student.admissionNo,
    });
    await auditLog(user.id, "UPDATE", "admissions", application.id, { status: "APPROVED", ref: application.referenceNo });
    await notifyRoleInApp(
      ["admin", "super_admin", "headteacher", "admissions_officer"],
      "Student enrolled from application",
      `${student.fullName} (${student.admissionNo}) was enrolled from application ${application.referenceNo}`,
      "success",
      "/admin/students",
    );

    // Email the parent the offer letter (school's own channels), with a short
    // WhatsApp/SMS notice. Best-effort — `notify` never throws on provider errors.
    await sendOfferToParent(application, student, { status: "APPROVED" });

    const app = await prisma.admissionApplication.findUnique({
      where: { id: params.id },
      include: {
        level: true,
        class: true,
        student: { select: { id: true, admissionNo: true, fullName: true } },
      },
    });
    return ok({ app, student, created: true });
  }

  // REJECTED or re-applying an already-approved application (no re-enrollment).
  const app = await prisma.admissionApplication.update({
    where: { id: params.id },
    data: { status },
    include: {
      level: true,
      class: true,
      student: { select: { id: true, admissionNo: true, fullName: true } },
    },
  });
  await auditLog(user.id, "UPDATE", "admissions", app.id, { status, ref: app.referenceNo });
  return ok({ app, student: app.student ?? null, created: createdStudent });
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("admissions", "delete");
  await prisma.admissionApplication.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "admissions", params.id);
  return ok({ deleted: true });
});

/**
 * Send the approved family their admission offer: the full letter as a PDF
 * attachment on email (when the parent gave one), plus a short WhatsApp/SMS
 * notice. Uses the SCHOOL's own messaging keys — never the developer's — and
 * is best-effort: a broken provider must never fail the approval itself.
 */
async function sendOfferToParent(
  application: {
    id: string; referenceNo: string; fullName: string; parentName: string;
    parentPhone: string; parentEmail: string | null;
    class: { name: string } | null; level: { name: string };
    classId: string | null; gender: string | null; dateOfBirth: Date | null;
    studentId: string | null;
  },
  student: { admissionNo: string },
  opts: { status: string },
) {
  try {
    const [school, year, term] = await Promise.all([
      getSchool(),
      prisma.academicYear.findFirst({ where: { isCurrent: true } }),
      prisma.term.findFirst({ where: { isCurrent: true } }),
    ]);
    const className = application.class?.name ?? application.level.name;
    const reopened = term?.reopeningDate ? fmtDate(term.reopeningDate) : "the reopening date";
    const due = new Date();
    due.setDate(due.getDate() + 7);
    const today = new Date();
    const schoolContact = [school?.address, school?.phone, school?.email].filter(Boolean).join(" · ");

    const pdf = buildAdmissionOfferPdf({
      schoolName: school?.name ?? "School",
      schoolMotto: school?.motto ?? null,
      schoolContact,
      childName: application.fullName,
      parentName: application.parentName,
      className,
      admissionNo: student.admissionNo,
      academicYear: year?.name ?? "",
      reference: application.referenceNo,
      date: fmtDate(today),
      reportingDate: reopened,
      acceptanceDeadline: fmtDate(due),
    });

    const message =
      `Dear ${application.parentName},\n\n` +
      `We are delighted to inform you that ${application.fullName} has been offered admission to ${school?.name ?? "our school"} in ${className} for the ${year?.name ?? ""} academic year.\n\n` +
      `Admission number: ${student.admissionNo}\n` +
      `Reporting date: ${reopened}\n\n` +
      `Your offer letter is attached to this message. Please present it with the required documents on reporting day.\n\n` +
      `— ${school?.name ?? "School"} Admissions Office`;

    await notify(
      { email: application.parentEmail, phone: application.parentPhone, whatsapp: application.parentPhone },
      message,
      {
        subject: `Admission Offer — ${school?.name ?? "School"} · ${application.fullName}`,
        attachments: [{ filename: `Admission-Offer-${application.referenceNo}.pdf`, content: pdf.toString("base64") }],
      },
    );
  } catch (err) {
    console.log("[admissions] offer email failed (best-effort):", err instanceof Error ? err.message : err);
  }
}
