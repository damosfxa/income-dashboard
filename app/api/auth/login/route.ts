import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signSession } from "@/lib/auth";
import { ok, fail } from "@/lib/response";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 menit

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return fail("Email dan password wajib diisi", 400);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Pesan error disamain (nggak bilang "email nggak ada" vs "password salah")
  // biar orang luar nggak bisa nebak email mana yang valid.
  const invalidCredentials = () => fail("Email atau password salah", 401);

  if (!user) {
    return invalidCredentials();
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000
    );
    return fail(
      `Terlalu banyak percobaan gagal. Coba lagi dalam ${minutesLeft} menit.`,
      429
    );
  }

  const valid = await verifyPassword(password, user.password);

  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      },
    });

    if (shouldLock) {
      return fail(
        "Terlalu banyak percobaan gagal. Akun dikunci 15 menit.",
        429
      );
    }
    return invalidCredentials();
  }

  // Login sukses, reset counter
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  const token = await signSession({ userId: user.id, email: user.email });

  const response = ok({ email: user.email });
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
