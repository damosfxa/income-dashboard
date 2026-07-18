import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { title, note, isAchieved } = await request.json();

  const item = await prisma.wishlist.findUnique({ where: { id } });
  if (!item) return fail("Item wishlist tidak ditemukan", 404);

  const updated = await prisma.wishlist.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(note !== undefined && { note: note || null }),
      ...(isAchieved !== undefined && {
        isAchieved,
        achievedAt: isAchieved ? new Date() : null,
      }),
    },
  });

  return ok(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const item = await prisma.wishlist.findUnique({ where: { id } });
  if (!item) return fail("Item wishlist tidak ditemukan", 404);

  await prisma.wishlist.delete({ where: { id } });

  return ok({ deleted: true });
}
