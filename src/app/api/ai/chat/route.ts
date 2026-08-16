import { NextResponse } from "next/server";
import { handle, ApiError, rateLimit, clientIp } from "@/lib/api";
import { chat, type ChatMessage } from "@/lib/ai";
import { isLanguageCode, DEFAULT_LANGUAGE } from "@/lib/i18n/languages";
import { getSchool } from "@/lib/school";
import { prisma } from "@/lib/prisma";

export const POST = handle(async (req) => {
  rateLimit(`ai:${clientIp(req)}`, 30, 60_000);
  const body = (await req.json()) as { messages?: ChatMessage[]; lang?: string };
  const messages = (body.messages ?? []).slice(-10);
  const lang = isLanguageCode(body.lang) ? body.lang : DEFAULT_LANGUAGE;
  if (!messages.length || !messages.some((m) => m.role === "user")) {
    throw new ApiError("A message is required.");
  }

  const [school, levels] = await Promise.all([
    getSchool(),
    prisma.level.findMany({ select: { name: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const reply = await chat(
    messages,
    {
      schoolName: school?.name ?? "School",
      motto: school?.motto,
      vision: school?.vision,
      mission: school?.mission,
      levels: levels.map((l) => l.name),
    },
    lang,
  );

  return NextResponse.json({ ok: true, data: { reply } });
});
