"use client";

import { useState } from "react";
import { Bus, Users2 } from "lucide-react";
import { CrudPage } from "@/components/admin/crud-page";
import { OPERATIONS_BY_ROUTE } from "@/lib/crud-configs";

export default function TransportPage() {
  const [tab, setTab] = useState<"routes" | "riders">("routes");
  const routesCfg = OPERATIONS_BY_ROUTE.get("transport/routes")!;
  const ridersCfg = OPERATIONS_BY_ROUTE.get("transport/riders")!;

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        <button onClick={() => setTab("routes")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "routes" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
          <Bus className="h-4 w-4" /> Routes
        </button>
        <button onClick={() => setTab("riders")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "riders" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
          <Users2 className="h-4 w-4" /> Riders
        </button>
      </div>
      {tab === "routes" ? <CrudPage cfg={routesCfg} /> : <CrudPage cfg={ridersCfg} />}
    </div>
  );
}
