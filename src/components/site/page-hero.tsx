import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared page-hero banner for public subpages — a theme-aware dark gradient
 * with soft brand glows and a subtle grid, so every page opens with the same
 * designed, modern feel (About, Programmes, Admissions, Contact, …).
 */
export function PageHero({
  title,
  subtitle,
  kicker,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  kicker?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("page-hero py-20 text-white", className)}>
      <div className="container-x relative z-10">
        {kicker && (
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">{kicker}</p>
        )}
        <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-slate-300 sm:text-lg">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}
