import { handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getSystemGate } from "@/lib/system-gate";

/** Current enforcement gate for any authenticated user (used by the /dev console). */
export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  return ok(await getSystemGate());
});
