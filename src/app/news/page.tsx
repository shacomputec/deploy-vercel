import { prisma } from "@/lib/prisma";
import { schoolWhere } from "@/lib/school";
import { NewsCard } from "@/components/site/news-card";
import { EmptyState } from "@/components/ui/empty";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "News" };

export default async function NewsPage() {
  const scope = await schoolWhere();
  const news = await prisma.newsItem.findMany({
    where: { published: true, ...scope },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div>
      <section className="bg-slate-900 py-16 text-white">
        <div className="container-x">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Updates</p>
          <h1 className="mt-2 text-4xl font-bold">School News</h1>
          <p className="mt-3 max-w-xl text-slate-300">Latest stories, achievements and announcements from our school community.</p>
        </div>
      </section>
      <section className="container-x py-14">
        {news.length === 0 ? (
          <EmptyState title="No news yet" hint="Check back soon for updates." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((n) => (
              <NewsCard key={n.id} slug={n.slug} title={n.title} excerpt={n.excerpt} coverImage={n.coverImage} publishedAt={n.publishedAt} author={n.author} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
