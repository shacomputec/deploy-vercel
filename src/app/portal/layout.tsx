import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/site/logo";
import { getSchool } from "@/lib/school";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const school = await getSchool();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between">
          <Logo school={school} />
          <span className="chip">Signed in as {user.fullName}</span>
        </div>
      </header>
      <main className="container-x py-8">{children}</main>
    </div>
  );
}
