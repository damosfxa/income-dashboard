import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const transactions = await prisma.transaction.findMany({
    where: { projectId: id },
    orderBy: { date: "desc" },
  });

  return ok(transactions);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { type, amount, note, date } = await request.json();

  if (!["INCOME", "EXPENSE"].includes(type)) {
    return fail("Tipe transaksi tidak valid", 400);
  }
  if (!amount || amount <= 0) {
    return fail("Nominal harus lebih dari 0", 400);
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return fail("Project tidak ditemukan", 404);

  const transaction = await prisma.transaction.create({
    data: {
      projectId: id,
      type,
      amount,
      note: note || null,
      date: date ? new Date(date) : new Date(),
    },
  });

  return ok(transaction, 201);
}
