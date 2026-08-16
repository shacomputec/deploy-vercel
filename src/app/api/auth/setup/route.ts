import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { setSessionCookie, signSession } from "@/lib/auth";

const setupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Which engine(s) the school runs: BASIC | SHS | BOTH (optional, defaults BOTH)
  schoolType: z.enum(["BASIC", "SHS", "BOTH"]).optional(),
});

export const POST = handle(async (req) => {
  const count = await prisma.user.count();
  if (count > 0) throw new ApiError("Setup has already been completed.", 409);

  const body = await req.json();
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);

  const { fullName, email, password, schoolType } = parsed.data;
  const developer = await prisma.role.findUnique({ where: { name: "developer" } });
  if (!developer) throw new ApiError("Developer role is missing. Run the database seed first.", 500);

  // Record the school type chosen at first-time setup so the whole platform
  // starts in the right engine (Basic / SHS / Both). No-op when absent.
  if (schoolType) {
    await prisma.school.upsert({
      where: { id: "main" },
      update: { schoolType },
      create: { id: "main", name: "My School", schoolType },
    });
  }

  const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
  const user = await prisma.user.create({
    data: {
      fullName,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, rounds),
      roleId: developer.id,
      status: "ACTIVE",
    },
    include: { role: true },
  });

  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role.name,
    roleLevel: user.role.level,
  });
  await setSessionCookie(token);
  return NextResponse.json({ ok: true, data: { email: user.email } });
});
