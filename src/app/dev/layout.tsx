import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// The Developer Console (/dev) is strictly developer-only. It is never shown
// in the admin portal menu and only the developer role may open it — every
// other account (including super admin) is redirected away.
export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role.name !== "developer") redirect("/admin");

  // A distinct dark "vendor console" shell — the licensing tools were built
  // against dark surfaces, so /dev gets its own full-height slate-950 stage
  // (the light site chrome wraps it; this is the console's canvas).
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* deep gradient + faint grid, echoing the aurora style in dark mode */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-48 -top-48 h-[36rem] w-[36rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-48 -right-40 h-[32rem] w-[32rem] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.25]" style={{ backgroundImage: "linear-gradient(to right, rgb(255 255 255 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.04) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      </div>
      <div className="relative px-4 py-10 sm:px-6 lg:px-10">{children}</div>
    </div>
  );
}
