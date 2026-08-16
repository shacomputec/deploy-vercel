import { crudApi } from "@/lib/crud";
import { OPERATIONS_BY_ROUTE } from "@/lib/crud-configs";

const cfg = OPERATIONS_BY_ROUTE.get("library/loans")!;
const api = crudApi(cfg);
export const GET = api.list;
export const POST = api.create;
