import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { fmtDate } from "@/lib/utils";

export function NewsCard({
  slug,
  title,
  excerpt,
  coverImage,
  publishedAt,
  author,
}: {
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  publishedAt?: Date | string | null;
  author?: string | null;
}) {
  return (
    <Link
      href={`/news/${slug}`}
      className="card card-hover group flex flex-col overflow-hidden"
    >
      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImage} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/80 to-emerald-900" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" />
          {fmtDate(publishedAt)}
          {author && <span className="truncate">· {author}</span>}
        </div>
        <h3 className="mt-2 line-clamp-2 text-base font-semibold text-ink transition group-hover:text-primary">
          {title}
        </h3>
        {excerpt && <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-500">{excerpt}</p>}
        <span className="mt-4 text-sm font-semibold text-primary">Read more →</span>
      </div>
    </Link>
  );
}
