import { handle, ApiError, readJson, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { getPortalAccount, assignPortalAccount, unlinkPortalAccount } from "@/lib/account";

export const GET = handle(async (_req, { params }) => {
  await requirePerm("students", "read");
  const account = await getPortalAccount("student", params.id);
  return ok(account);
});

export const POST = handle(async (req, { params }) => {
  const actor = await requirePerm("students", "update");
  await requirePerm("users", "create");
  await requirePerm("users", "update"); // only developer/admin/super_admin may assign logins
  const body = await readJson<{ email?: string; password?: string }>(req);
  if (body.password && body.password.length < 8) throw new ApiError("Password must be at least 8 characters.");
  const result = await assignPortalAccount("student", params.id, body);
  await auditLog(actor.id, result.action === "created" ? "ASSIGN_LOGIN" : "RESET_LOGIN", "students", params.id, {
    email: result.email,
    linked: true,
  });
  return ok(result, { status: result.action === "created" ? 201 : 200 });
});

export const DELETE = handle(async (req, { params }) => {
  const actor = await requirePerm("students", "update");
  await requirePerm("users", "update");
  await unlinkPortalAccount("student", params.id);
  await auditLog(actor.id, "REVOKE_LOGIN", "students", params.id);
  return ok({ removed: true });
});
