import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolId } from "@/lib/school";
import { fmtDate } from "@/lib/utils";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const schoolId = await getActiveSchoolId();
  const item = await prisma.newsItem.findFirst({ where: { slug: params.slug, schoolId } });
  return { title: item?.title ?? "News" };
}

export default async function NewsDetailPage({ params }: { params: { slug: string } }) {
  const schoolId = await getActiveSchoolId();
  const item = await prisma.newsItem.findFirst({ where: { slug: params.slug, schoolId } });
  if (!item || !item.published) notFound();

  const related = await prisma.newsItem.findMany({
    where: { published: true, schoolId, id: { not: item.id } },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  return (
    <div>
      <section className="page-hero text-white">
        <div className="container-x">
          <Link href="/news" className="inline-flex items-center gap-1.5 text-sm text-slate-300 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" /> All news
          </Link>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">{item.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-300">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" /> {fmtDate(item.publishedAt)}
            </span>
            {item.author && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" /> {item.author}
              </span>
            )}
          </div>
        </div>
      </section>

      <article className="container-x py-12">
        <div className="mx-auto max-w-3xl">
          {item.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.coverImage} alt={item.title} className="mb-8 h-72 w-full rounded-2xl object-cover shadow-lift" />
          )}
          {item.excerpt && <p className="text-lg font-medium leading-relaxed text-slate-700">{item.excerpt}</p>}
          <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-600">
            {(item.body ?? item.excerpt ?? "").split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>

        {related.length > 0 && (
          <div className="mx-auto mt-16 max-w-3xl border-t border-slate-200 pt-10">
            <h2 className="text-lg font-semibold text-ink">More News</h2>
            <ul className="mt-4 space-y-3">
              {related.map((n) => (
                <li key={n.id}>
                  <Link href={`/news/${n.slug}`} className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-primary/40 hover:shadow-card">
                    <span className="font-medium text-slate-700 group-hover:text-primary">{n.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">{fmtDate(n.publishedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </div>
  );
}
