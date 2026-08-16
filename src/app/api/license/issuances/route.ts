import { handle, ApiError, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/license/issuances — the developer's issuance history.
 * Raw keys are NEVER returned: each row shows the public nonce, the SHA-256
 * key hash (useful to verify a school's key against), school, validity days,
 * email-send status, who issued it and when.
 */
export const GET = handle(async (req) => {
  const user = await requirePerm("licensing", "update");
  if (user.role.name !== "developer") {
    throw new ApiError("Only the system developer can view license issuance history.", 403);
  }
  void req;
  const issuances = await prisma.licenseIssuance.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { issuedBy: { select: { fullName: true, email: true } } },
  });
  return ok(
    issuances.map((i) => ({
      id: i.id,
      schoolId: i.schoolId,
      days: i.days,
      nonce: i.nonce,
      keyHash: i.keyHash,
      sentTo: i.sentTo,
      sentAt: i.sentAt,
      revokedAt: i.revokedAt,
      issuedBy: i.issuedBy?.fullName ?? null,
      createdAt: i.createdAt,
    }))
  );
});
