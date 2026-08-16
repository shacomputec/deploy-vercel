import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type PersonKind = "teacher" | "parent" | "student";

const ROLE_BY_KIND: Record<PersonKind, string> = {
  teacher: "teacher",
  parent: "parent",
  student: "student",
};

/** A teacher/parent/student record plus its (optional) linked login account. */
export type PortalAccount = {
  linked: boolean;
  userId: string | null;
  email: string | null;
  roleName: string | null;
  status: string | null;
  lastLoginAt: string | null;
};

export function randomPassword() {
  return `Tmp@${crypto.randomBytes(6).toString("hex")}${crypto.randomInt(1000, 9999)}`;
}

async function findPerson(kind: PersonKind, id: string) {
  if (kind === "teacher") return prisma.teacher.findUnique({ where: { id } });
  if (kind === "parent") return prisma.parent.findUnique({ where: { id } });
  return prisma.student.findUnique({ where: { id } });
}

/** Fetch the linked login account for a teacher/parent/student record. */
export async function getPortalAccount(kind: PersonKind, id: string): Promise<PortalAccount> {
  const person = await findPerson(kind, id);
  if (!person) throw new Error("Record not found");
  const userId = (person as { userId?: string | null }).userId ?? null;
  if (!userId) {
    return {
      linked: false,
      userId: null,
      email: (person as { email?: string | null }).email ?? null,
      roleName: null,
      status: null,
      lastLoginAt: null,
    };
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user) {
    // Dangling link (account was deleted) — clear it defensively so a later
    // assign starts from a clean slate.
    await prisma.teacher.update({ where: { id }, data: { userId: null } }).catch(() => undefined);
    await prisma.parent.update({ where: { id }, data: { userId: null } }).catch(() => undefined);
    await prisma.student.update({ where: { id }, data: { userId: null } }).catch(() => undefined);
    return {
      linked: false,
      userId: null,
      email: (person as { email?: string | null }).email ?? null,
      roleName: null,
      status: null,
      lastLoginAt: null,
    };
  }
  return {
    linked: true,
    userId: user.id,
    email: user.email,
    roleName: user.role.name,
    status: user.status,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

/**
 * Create (or reset) the login account linked to a teacher/parent/student.
 * When `email` is omitted it falls back to the record's own email; a password
 * is auto-generated when `password` is omitted. Returns the login email and —
 * only when a new/auto password was issued — the plaintext password to hand
 * over once.
 */
export async function assignPortalAccount(
  kind: PersonKind,
  id: string,
  opts: { email?: string; password?: string; fullName?: string }
): Promise<{ userId: string; email: string; password?: string; action: "created" | "reset" }> {
  const person = await findPerson(kind, id);
  if (!person) throw new Error("Record not found");

  const recordEmail = (person as { email?: string | null }).email ?? null;
  const fullName = opts.fullName ?? (person as { fullName?: string }).fullName ?? "Portal User";
  const email = (opts.email ?? recordEmail ?? "").trim().toLowerCase();
  if (!email) throw new Error("An email address is required — set one on the record or provide it here.");

  const roleName = ROLE_BY_KIND[kind];
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw new Error(`Role "${roleName}" not found`);

  const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
  const existingId = (person as { userId?: string | null }).userId ?? null;
  const existing = existingId ? await prisma.user.findUnique({ where: { id: existingId } }) : null;

  // Email must be unique across all users — otherwise a clean 409, not a 500.
  const emailTaken = existing
    ? await prisma.user.findFirst({ where: { email, id: { not: existing.id } }, select: { id: true } })
    : await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (emailTaken) throw Object.assign(new Error("A user with this email already exists."), { status: 409 });

  const issuePassword = opts.password ?? randomPassword();
  const passwordHash = await bcrypt.hash(issuePassword, rounds);

  if (existing) {
    // Reset password + email on the already-linked account. Status is left
    // untouched — a reset must not silently reactivate a suspended account.
    await prisma.user.update({
      where: { id: existing.id },
      data: { email, passwordHash, fullName },
    });
    return { userId: existing.id, email, password: opts.password ? undefined : issuePassword, action: "reset" };
  }

  // Fresh account — link it to the record so the portals find it by userId.
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      roleId: role.id,
      status: "ACTIVE",
    },
  });
  const link = { userId: user.id };
  if (kind === "teacher") await prisma.teacher.update({ where: { id }, data: link });
  else if (kind === "parent") await prisma.parent.update({ where: { id }, data: link });
  else await prisma.student.update({ where: { id }, data: link });

  return { userId: user.id, email, password: opts.password ? undefined : issuePassword, action: "created" };
}

/** Remove the login account linked to a record (revokes portal access). */
export async function unlinkPortalAccount(kind: PersonKind, id: string): Promise<{ removed: boolean }> {
  const person = await findPerson(kind, id);
  if (!person) throw new Error("Record not found");
  const userId = (person as { userId?: string | null }).userId ?? null;
  if (userId) {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  }
  const link = { userId: null };
  if (kind === "teacher") await prisma.teacher.update({ where: { id }, data: link });
  else if (kind === "parent") await prisma.parent.update({ where: { id }, data: link });
  else await prisma.student.update({ where: { id }, data: link });
  return { removed: !!userId };
}
