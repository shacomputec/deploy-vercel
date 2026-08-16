"use client";

import { useState } from "react";
import { BedDouble, DoorOpen } from "lucide-react";
import { CrudPage } from "@/components/admin/crud-page";
import { OPERATIONS_BY_ROUTE } from "@/lib/crud-configs";

export default function HostelPage() {
  const [tab, setTab] = useState<"rooms" | "allocations">("rooms");
  const roomsCfg = OPERATIONS_BY_ROUTE.get("hostel/rooms")!;
  const allocCfg = OPERATIONS_BY_ROUTE.get("hostel/allocations")!;

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        <button onClick={() => setTab("rooms")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "rooms" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
          <DoorOpen className="h-4 w-4" /> Rooms
        </button>
        <button onClick={() => setTab("allocations")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "allocations" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
          <BedDouble className="h-4 w-4" /> Bed Allocations
        </button>
      </div>
      {tab === "rooms" ? <CrudPage cfg={roomsCfg} /> : <CrudPage cfg={allocCfg} />}
    </div>
  );
}
