import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { verifyPassword, hashPassword } from "@/lib/password";
import { ok, fail } from "@/lib/response";

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return fail("Belum login", 401);

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return fail("Password lama dan baru wajib diisi", 400);
  }
  if (newPassword.length < 8) {
    return fail("Password baru minimal 8 karakter", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return fail("User tidak ditemukan", 404);

  const valid = await verifyPassword(currentPassword, user.password);
  if (!valid) return fail("Password lama salah", 401);

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  return ok({ updated: true });
}
