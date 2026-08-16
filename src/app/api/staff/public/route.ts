import { handle, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/** Public staff directory — used by the public website “Meet Our Staff” page. */
export const GET = handle(async () => {
  const staff = await prisma.staff.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ department: "asc" }, { fullName: "asc" }],
    select: { id: true, staffId: true, fullName: true, designation: true, department: true, photo: true },
  });
  return ok(staff);
});
