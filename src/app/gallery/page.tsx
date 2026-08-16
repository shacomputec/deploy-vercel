import { prisma } from "@/lib/prisma";
import { schoolWhere } from "@/lib/school";
import { GalleryClient } from "@/components/site/gallery-client";
import { EmptyState } from "@/components/ui/empty";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryPage() {
  const scope = await schoolWhere();
  const images = await prisma.galleryImage.findMany({ where: scope, orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <section className="page-hero text-white">
        <div className="container-x">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Moments</p>
          <h1 className="mt-2 text-4xl font-bold">Photo Gallery</h1>
          <p className="mt-3 max-w-xl text-slate-300">A glimpse of everyday life, learning and celebrations at our school.</p>
        </div>
      </section>
      <section className="container-x py-14">
        {images.length === 0 ? (
          <EmptyState title="Gallery coming soon" />
        ) : (
          <GalleryClient images={images.map((i) => ({ id: i.id, url: i.url, title: i.title, caption: i.caption }))} />
        )}
      </section>
    </div>
  );
}
