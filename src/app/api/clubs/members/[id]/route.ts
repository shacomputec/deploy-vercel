import { crudApi } from "@/lib/crud";
import { OPERATIONS_BY_ROUTE } from "@/lib/crud-configs";

const cfg = OPERATIONS_BY_ROUTE.get("clubs/members")!;
const api = crudApi(cfg);
export const PUT = api.update;
export const DELETE = api.remove;
