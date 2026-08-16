"use client";

import { useRouter } from "next/navigation";

export function DevSignOut() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-rose-500/15 hover:text-rose-300"
    >
      Sign out
    </button>
  );
}
