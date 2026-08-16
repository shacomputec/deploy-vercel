"use client";

import { CrudPage } from "@/components/admin/crud-page";
import { OPERATIONS_BY_ROUTE } from "@/lib/crud-configs";

export default function ClinicPage() {
  return <CrudPage cfg={OPERATIONS_BY_ROUTE.get("clinic/visits")!} />;
}
