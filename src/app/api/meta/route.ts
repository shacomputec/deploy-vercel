import { prisma } from "@/lib/prisma";
import { handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getSchoolType, levelVisible, classVisible } from "@/lib/school-type";

export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };

  const schoolType = await getSchoolType();
  const [levels, classes, subjects, terms, years, teachers, feeItems] = await Promise.all([
    prisma.level.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.class.findMany({ orderBy: { name: "asc" }, include: { level: true, classTeacher: true } }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, include: { level: true } }),
    prisma.term.findMany({ orderBy: { startDate: "asc" }, include: { academicYear: true } }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" } }),
    prisma.teacher.findMany({ where: { status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, staffId: true } }),
    prisma.feeItem.findMany({ include: { level: true } }),
  ]);

  // School-type engine: a BASIC school never sees SHS levels/classes in
  // pickers; an SHS school only sees the SHS engine. BOTH shows everything.
  const visibleLevels = levels.filter((l) => levelVisible(l.code, schoolType));
  const visibleClasses = classes.filter((c) => classVisible(c.level.code, schoolType));

  return ok({
    schoolType,
    levels: visibleLevels,
    classes: visibleClasses,
    subjects: subjects.filter((s) => levelVisible(s.level.code, schoolType)),
    terms,
    years,
    teachers,
    feeItems: feeItems.filter((f) => !f.levelId || visibleLevels.some((l) => l.id === f.levelId)),
  });
});
