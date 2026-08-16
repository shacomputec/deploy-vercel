import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { newsSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { getActiveSchoolId } from "@/lib/school";

export const GET = handle(async () => {
  await requirePerm("content", "read");
  const schoolId = await getActiveSchoolId();
  const items = await prisma.newsItem.findMany({ where: { schoolId }, orderBy: { publishedAt: "desc" } });
  return ok(items);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("content", "create");
  const schoolId = await getActiveSchoolId();
  const parsed = newsSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;

  const base = slugify(d.title) || `news-${Date.now()}`;
  let slug = base;
  let n = 2;
  while (await prisma.newsItem.findFirst({ where: { slug, schoolId } })) {
    slug = `${base}-${n++}`;
  }

  const item = await prisma.newsItem.create({
    data: {
      schoolId,
      slug,
      title: d.title,
      excerpt: d.excerpt || null,
      body: d.body || null,
      coverImage: d.coverImage || null,
      author: d.author || null,
      published: d.published ?? true,
      publishedAt: d.published === false ? null : new Date(),
    },
  });
  await auditLog(user.id, "CREATE", "content.news", item.id, { title: item.title });
  return NextResponse.json({ ok: true, data: item }, { status: 201 });
});
