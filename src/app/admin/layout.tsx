import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSchoolType } from "@/lib/school-type";
import { getSystemGate } from "@/lib/system-gate";
import { getSchool } from "@/lib/school";
import { AdminShell } from "@/components/admin/admin-shell";
import { LockScreen } from "@/components/dev/lock-screen";
import { TermsGate } from "@/components/dev/terms-gate";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Non-staff roles belong in their own portals, never the admin portal — a
  // student, parent, guest or PTA executive who types /admin by hand is sent
  // back to their portal instead of seeing the admin shell. Teachers and all
  // office staff (level ≥ 400) keep /admin for their permitted pages.
  if (["student", "parent", "guest", "pta_executive"].includes(user.role.name)) {
    const portal =
      user.role.name === "student"
        ? "/portal/student"
        : user.role.name === "parent"
          ? "/portal/parent"
          : "/";
    redirect(portal);
  }

  // The Developer account ALWAYS bypasses the gate — they run the console at
  // /dev and manage the schools. Every other role is subject to it.
  if (user.role.name !== "developer") {
    const gate = await getSystemGate();
    if (gate.systemLocked) {
      const school = await getSchool();
      return (
        <LockScreen
          systemLocked
          message={gate.lockMessage}
          licenseBlocked={false}
          developerContact={{
            developerName: school?.developerName,
            developerPhone: school?.developerPhone,
            developerEmail: school?.developerEmail,
          }}
        />
      );
    }
    if (gate.licenseBlocked) {
      const school = await getSchool();
      return (
        <LockScreen
          systemLocked={false}
          message={gate.licenseMessage}
          licenseBlocked
          developerContact={{
            developerName: school?.developerName,
            developerPhone: school?.developerPhone,
            developerEmail: school?.developerEmail,
          }}
        />
      );
    }
    if (gate.needsTermsAcceptance) {
      return <TermsGate content={gate.termsContent} />;
    }
  }

  const schoolType = await getSchoolType();
  return (
    <AdminShell
      user={{ name: user.fullName, email: user.email, role: user.role.displayName, roleName: user.role.name }}
      schoolType={schoolType}
    >
      {children}
    </AdminShell>
  );
}
