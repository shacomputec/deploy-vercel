"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function GalleryClient({
  images,
}: {
  images: { id: string; url: string; title: string | null; caption: string | null }[];
}) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setActive(i)}
            className="group relative block w-full overflow-hidden rounded-2xl shadow-card transition hover:shadow-lift"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.title ?? "Gallery photo"} className="w-full object-cover transition duration-500 group-hover:scale-105" />
            {(img.title || img.caption) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-4 pt-10 text-left opacity-0 transition group-hover:opacity-100">
                {img.title && <p className="text-sm font-semibold text-white">{img.title}</p>}
                {img.caption && <p className="text-xs text-slate-200">{img.caption}</p>}
              </div>
            )}
          </button>
        ))}
      </div>

      {active !== null && images[active] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4" onClick={() => setActive(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
          <figure className="max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[active].url} alt={images[active].title ?? ""} className="max-h-[80vh] w-auto rounded-xl object-contain" />
            {(images[active].title || images[active].caption) && (
              <figcaption className="mt-3 text-center text-sm text-slate-300">
                {images[active].title} {images[active].caption && <span className="text-slate-400">— {images[active].caption}</span>}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </>
  );
}
