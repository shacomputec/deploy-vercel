"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  title: string;
  subtitle?: string;
  image?: string;
  cta?: string;
  link?: string;
};

export function HeroSlider({ slides, defaultImage }: { slides: HeroSlide[]; defaultImage?: string | null }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const fallback: HeroSlide[] = [{ title: "Welcome to our School", subtitle: "Nurturing future leaders.", image: defaultImage ?? undefined }];
  const list = slides.length ? slides : fallback;

  useEffect(() => {
    if (paused || list.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % list.length), 6000);
    return () => clearInterval(t);
  }, [paused, list.length]);

  const slide = list[index];
  const img = slide.image || defaultImage;

  return (
    <section
      className="relative h-[560px] w-full overflow-hidden bg-slate-900 md:h-[620px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary to-emerald-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/70 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="container-x relative z-10 flex h-full flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="max-w-2xl"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              NaCCA · GES Accredited
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">{slide.title}</h1>
            {slide.subtitle && <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">{slide.subtitle}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              {slide.link && slide.cta ? (
                <Link href={slide.link} className="btn-accent btn-lg">
                  {slide.cta}
                </Link>
              ) : (
                <Link href="/admissions" className="btn-accent btn-lg">
                  Apply for Admission
                </Link>
              )}
              <Link href="/about" className="btn-lg rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-base font-semibold text-white backdrop-blur transition hover:bg-white/20">
                Learn More
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {list.length > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + list.length) % list.length)}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-2.5 text-white backdrop-blur transition hover:bg-white/25"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % list.length)}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-2.5 text-white backdrop-blur transition hover:bg-white/25"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {list.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={cn("h-2 rounded-full transition-all", i === index ? "w-8 bg-amber-400" : "w-2 bg-white/40 hover:bg-white/70")}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
