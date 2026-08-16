import { handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";
import { auditLog } from "@/lib/audit";

/** Record the school's acceptance of the current Terms & Conditions version. */
export const POST = handle(async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  const version = await getSetting("terms.version");
  if (!version) throw { status: 409, message: "No terms have been published yet." };
  await setSetting("terms.acceptedVersion", version);
  await auditLog(user.id, "ACCEPT_TERMS", "terms", version, { version });
  return ok({ acceptedVersion: version });
});
