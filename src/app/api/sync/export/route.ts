import { handle, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { exportSnapshot } from "@/lib/sync";

// Cold Neon databases can take a while on first connect — allow more time.
export const maxDuration = 60;

export const POST = handle(async () => {
  const user = await requirePerm("dashboard", "read");
  if (user.role.name !== "developer" && user.role.name !== "super_admin") {
    throw { status: 403, message: "Only the developer or super admin can sync the full database." };
  }
  const snapshot = await exportSnapshot();
  return ok(snapshot);
});
