import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { type, amount, note, date } = await request.json();

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) return fail("Transaksi tidak ditemukan", 404);

  if (type && !["INCOME", "EXPENSE"].includes(type)) {
    return fail("Tipe transaksi tidak valid", 400);
  }
  if (amount !== undefined && amount <= 0) {
    return fail("Nominal harus lebih dari 0", 400);
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...(type && { type }),
      ...(amount !== undefined && { amount }),
      ...(note !== undefined && { note: note || null }),
      ...(date && { date: new Date(date) }),
    },
  });

  return ok(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) return fail("Transaksi tidak ditemukan", 404);

  await prisma.transaction.delete({ where: { id } });

  return ok({ deleted: true });
}
