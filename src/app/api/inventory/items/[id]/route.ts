import { crudApi } from "@/lib/crud";
import { OPERATIONS_BY_ROUTE } from "@/lib/crud-configs";

const cfg = OPERATIONS_BY_ROUTE.get("inventory/items")!;
const api = crudApi(cfg);

export const GET = api.list;
export const PUT = api.update;
export const DELETE = api.remove;
