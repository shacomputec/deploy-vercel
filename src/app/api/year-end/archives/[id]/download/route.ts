import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";

/** Download a year-end archive as a JSON file for safe offsite storage. */
export const GET = handle(async (_req, { params }: { params: Record<string, string> }) => {
  await requirePerm("yearEnd", "read");
  const archive = await prisma.dataArchive.findUnique({ where: { id: params.id } });
  if (!archive) throw new ApiError("Archive not found", 404);

  const stamp = archive.createdAt.toISOString().slice(0, 10);
  const safe = archive.title.replace(/[^\w.-]+/g, "-").slice(0, 60);
  return new Response(archive.payload, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="archive-${stamp}-${safe}.json"`,
    },
  });
});
