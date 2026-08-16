import { NextResponse } from "next/server";
import { deflateRawSync } from "zlib";
import { handle } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { getSchool } from "@/lib/school";
import { LESSON_SAMPLES, dbSamples } from "@/lib/lesson-samples";
import { buildLessonNotePdf } from "@/lib/lesson-note-pdf";

const DEV = { name: "shacomputec", email: "shacomputecgh@gmail.com", tel: "+233 530 941 750" };

function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "lesson-note";
}

/** Minimal ZIP archive writer (store via deflate) — dependency-free. */
function zip(files: { name: string; data: Buffer }[]): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf8");
    const comp = deflateRawSync(f.data);
    const crc = crc32(f.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header sig
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // flags (UTF-8 names)
    local.writeUInt16LE(8, 8); // method: deflate
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, comp);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); // central dir header sig
    cen.writeUInt16LE(20, 4); // version made by
    cen.writeUInt16LE(20, 6); // version needed
    cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(8, 10);
    cen.writeUInt16LE(dosTime, 12);
    cen.writeUInt16LE(dosDate, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(comp.length, 20);
    cen.writeUInt32LE(f.data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt16LE(0, 30); // extra len
    cen.writeUInt16LE(0, 32); // comment len
    cen.writeUInt16LE(0, 34); // disk number
    cen.writeUInt16LE(0, 36); // internal attrs
    cen.writeUInt32LE(0, 38); // external attrs
    cen.writeUInt32LE(offset, 42); // local header offset
    central.push(cen, nameBuf);

    offset += 30 + nameBuf.length + comp.length;
  }

  const centralStart = offset;
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD sig
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(centralStart, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, centralBuf, eocd]);
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

/**
 * Download every built-in sample lesson note as one ZIP of PDFs.
 *   GET /api/lessons/samples/pdf/all
 */
export const GET = handle(async () => {
  await requirePerm("lessons", "read");
  const school = await getSchool();

  const all = [...LESSON_SAMPLES, ...(await dbSamples())];
  const files = all.map((sample) => {
    const pdf = buildLessonNotePdf({
      schoolName: school?.name ?? "Ghana Education Service",
      schoolMotto: school?.motto,
      subject: sample.subject,
      level: sample.level,
      topic: sample.topic,
      week: sample.week,
      duration: sample.duration,
      objectives: sample.objectives,
      resources: sample.resources,
      activityIntro: sample.activityIntro,
      activityMain: sample.activityMain,
      activityPlenary: sample.activityPlenary,
      homework: sample.homework,
      developerName: DEV.name,
      developerPhone: DEV.tel,
      developerEmail: DEV.email,
    });
    return {
      name: `${sample.level.replace(/\s+/g, "-")}_${slug(sample.subject)}_${slug(sample.topic).slice(0, 40)}.pdf`,
      data: pdf,
    };
  });

  const archive = zip(files);
  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="Sample-Lesson-Notes-${slug(school?.name ?? "school")}.zip"`,
    },
  });
});
