import { crudApi } from "@/lib/crud";
import { OPERATIONS_BY_ROUTE } from "@/lib/crud-configs";

const cfg = OPERATIONS_BY_ROUTE.get("payroll/scales")!;
export const { list: GET, create: POST } = crudApi(cfg);
