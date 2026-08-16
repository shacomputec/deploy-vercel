import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Not authenticated", 401);

  const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  const currentTerm = await prisma.term.findFirst({ where: { isCurrent: true } });

  if (user.role.name === "student") {
    const student = await prisma.student.findFirst({
      where: { userId: user.id },
      include: { class: { include: { level: true } } },
    });
    if (!student) throw new ApiError("No student record linked to this account.", 404);

    const [reports, attendance, payments] = await Promise.all([
      prisma.reportCard.findMany({
        where: { studentId: student.id, published: true },
        orderBy: { createdAt: "desc" },
        include: { term: true, academicYear: true },
      }),
      prisma.attendanceRecord.findMany({
        where: { studentId: student.id, date: { gte: currentTerm?.startDate } },
        orderBy: { date: "desc" },
        take: 60,
      }),
      prisma.feePayment.findMany({ where: { studentId: student.id }, orderBy: { date: "desc" }, take: 10 }),
    ]);
    return NextResponse.json({ ok: true, data: { portal: "student", student, reports, attendance, payments } });
  }

  if (user.role.name === "parent") {
    const parents = await prisma.parent.findMany({ where: { userId: user.id } });
    const parentIds = parents.map((p) => p.id);
    const children = await prisma.studentParent.findMany({
      where: { parentId: { in: parentIds } },
      include: { student: { include: { class: { include: { level: true } } } } },
    });
    const students = children.map((c) => c.student);
    const reports = await prisma.reportCard.findMany({
      where: { studentId: { in: students.map((s) => s.id) }, published: true },
      orderBy: { createdAt: "desc" },
      include: { student: true, term: true, academicYear: true },
      take: 20,
    });
    return NextResponse.json({ ok: true, data: { portal: "parent", students, reports } });
  }

  if (["teacher", "subject_teacher", "form_teacher"].includes(user.role.name)) {
    const teacher = await prisma.teacher.findFirst({ where: { userId: user.id } });
    if (!teacher) throw new ApiError("No teacher record linked to this account.", 404);
    const classes = await prisma.class.findMany({ where: { classTeacherId: teacher.id }, include: { level: true } });
    const subjectClasses = await prisma.classSubject.findMany({
      where: { teacherId: teacher.id },
      include: { class: { include: { level: true } }, subject: true },
    });
    return NextResponse.json({ ok: true, data: { portal: "teacher", teacher, classes, subjectClasses } });
  }

  return NextResponse.json({ ok: true, data: { portal: "admin", user } });
});
