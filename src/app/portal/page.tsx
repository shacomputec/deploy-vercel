import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function PortalIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role.name === "developer") redirect("/dev");
  if (user.role.name === "student") redirect("/portal/student");
  if (user.role.name === "parent") redirect("/portal/parent");
  if (["teacher", "subject_teacher", "form_teacher"].includes(user.role.name)) redirect("/portal/teacher");
  if (user.role.name === "guest") redirect("/");
  redirect("/admin");
}
