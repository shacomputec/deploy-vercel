import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import type { CrudConfig, FieldDef } from "@/lib/crud-configs";

// prisma client as a dynamic record for allow-listed model names
const db = prisma as unknown as Record<string, any>;

function coerce(f: FieldDef, value: unknown) {
  if (value === undefined || value === null || value === "") {
    if (f.required) throw new ApiError(`${f.label} is required`);
    return undefined;
  }
  switch (f.type) {
    case "number":
      return Number(value);
    case "date":
      return new Date(String(value));
    case "boolean":
      return value === true || value === "true";
    default:
      return String(value);
  }
}

function buildWhere(cfg: CrudConfig, url: URL) {
  const q = url.searchParams.get("q")?.trim();
  if (!q) return undefined;
  return {
    OR: cfg.searchFields.map((f) => ({ [f]: { contains: q } })),
  };
}

export function crudApi(cfg: CrudConfig) {
  const model = db[cfg.model];
  if (!model) throw new Error(`crudApi: unknown model "${cfg.model}"`);

  return {
    list: handle(async (req) => {
      await requirePerm(cfg.module, "read");
      const url = new URL(req.url);
      const rows = await model.findMany({
        where: buildWhere(cfg, url),
        orderBy: cfg.orderBy ?? { createdAt: "desc" as const },
        take: 500,
      });
      return ok(rows);
    }),

    create: handle(async (req) => {
      const user = await requirePerm(cfg.module, "create");
      const body = await req.json();
      const data: Record<string, unknown> = {};
      for (const f of cfg.fields) {
        const v = coerce(f, body[f.name]);
        if (v !== undefined) data[f.name] = v;
      }
      const row = await model.create({ data });
      await auditLog(user.id, "CREATE", cfg.model, row.id, { name: cfg.titleField ? row[cfg.titleField] : undefined });
      return NextResponse.json({ ok: true, data: row }, { status: 201 });
    }),

    update: handle(async (req, { params }) => {
      const user = await requirePerm(cfg.module, "update");
      const body = await req.json();
      const data: Record<string, unknown> = {};
      for (const f of cfg.fields) {
        if (body[f.name] !== undefined) {
          const v = coerce(f, body[f.name]);
          if (v !== undefined) data[f.name] = v;
        }
      }
      const row = await model.update({ where: { id: params.id }, data });
      await auditLog(user.id, "UPDATE", cfg.model, row.id);
      return ok(row);
    }),

    remove: handle(async (req, { params }) => {
      const user = await requirePerm(cfg.module, "delete");
      await model.delete({ where: { id: params.id } });
      await auditLog(user.id, "DELETE", cfg.model, params.id);
      return ok({ deleted: true });
    }),
  };
}
