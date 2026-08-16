"use client";

import { useState } from "react";
import { BookOpen, HandCoins } from "lucide-react";
import { CrudPage } from "@/components/admin/crud-page";
import { OPERATIONS_BY_ROUTE } from "@/lib/crud-configs";

export default function LibraryPage() {
  const [tab, setTab] = useState<"books" | "loans">("books");
  const booksCfg = OPERATIONS_BY_ROUTE.get("library/books")!;
  const loansCfg = OPERATIONS_BY_ROUTE.get("library/loans")!;

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        <button onClick={() => setTab("books")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "books" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
          <BookOpen className="h-4 w-4" /> Books
        </button>
        <button onClick={() => setTab("loans")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "loans" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
          <HandCoins className="h-4 w-4" /> Loans
        </button>
      </div>
      {tab === "books" ? <CrudPage cfg={booksCfg} /> : <CrudPage cfg={loansCfg} />}
    </div>
  );
}
