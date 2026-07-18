import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";

export async function GET() {
  const items = await prisma.wishlist.findMany({
    orderBy: { createdAt: "desc" },
  });
  return ok(items);
}

export async function POST(request: Request) {
  const { title, note } = await request.json();

  if (!title || !title.trim()) {
    return fail("Judul wishlist wajib diisi", 400);
  }

  const item = await prisma.wishlist.create({
    data: { title, note: note || null },
  });

  return ok(item, 201);
}
