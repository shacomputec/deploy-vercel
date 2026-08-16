"use client";

import { useState } from "react";
import { Users, Trophy } from "lucide-react";
import { CrudPage } from "@/components/admin/crud-page";
import { OPERATIONS_BY_ROUTE } from "@/lib/crud-configs";

export default function ClubsPage() {
  const [tab, setTab] = useState<"clubs" | "members">("clubs");
  const clubsCfg = OPERATIONS_BY_ROUTE.get("clubs")!;
  const membersCfg = OPERATIONS_BY_ROUTE.get("clubs/members")!;

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        <button onClick={() => setTab("clubs")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "clubs" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
          <Trophy className="h-4 w-4" /> Clubs & Societies
        </button>
        <button onClick={() => setTab("members")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "members" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
          <Users className="h-4 w-4" /> Members
        </button>
      </div>
      {tab === "clubs" ? <CrudPage cfg={clubsCfg} /> : <CrudPage cfg={membersCfg} />}
    </div>
  );
}
