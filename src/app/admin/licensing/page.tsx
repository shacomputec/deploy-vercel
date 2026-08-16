import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/**
 * The developer console no longer lives inside the admin portal — it moved to
 * the standalone, developer-only surface at /dev. This old path simply forwards
 * developers there and bounces everyone else back to the admin dashboard.
 */
export default async function LicensingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role.name !== "developer") redirect("/admin");
  redirect("/dev");
}
