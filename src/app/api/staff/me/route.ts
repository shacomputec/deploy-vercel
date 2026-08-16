import { handle, ok, readJson, ApiError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const MAX_PHOTO = 4 * 1024 * 1024; // 4MB data URL

export const GET = handle(async () => {
  const user = await requireAuth();
  const staff = await prisma.staff.findUnique({ where: { userId: user.id } });
  if (!staff) throw new ApiError("No staff profile is linked to this account.", 404);
  return ok(staff);
});

export const PATCH = handle(async (req) => {
  const user = await requireAuth();
  const staff = await prisma.staff.findUnique({ where: { userId: user.id } });
  if (!staff) throw new ApiError("No staff profile is linked to this account.", 404);

  const body = (await readJson(req)) as {
    phone?: string;
    email?: string;
    photo?: string | null;
  };

  const data: { phone?: string | null; email?: string | null; photo?: string | null } = {};
  if (typeof body.phone === "string") data.phone = body.phone.trim() || null;
  if (typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ApiError("Enter a valid email address.", 422);
    data.email = email || null;
  }
  if (typeof body.photo === "string") {
    if (body.photo.length > MAX_PHOTO) throw new ApiError("Photo is too large (max 4MB).", 422);
    if (!/^data:image\/(png|jpe?g|webp);base64,/.test(body.photo)) throw new ApiError("Photo must be a PNG, JPG or WebP image.", 422);
    data.photo = body.photo;
  } else if (body.photo === null) {
    data.photo = null;
  }

  const updated = await prisma.staff.update({ where: { id: staff.id }, data });
  await auditLog(user.id, "UPDATE", "staff", staff.id, { self: true, fields: Object.keys(data) });
  return ok(updated);
});
