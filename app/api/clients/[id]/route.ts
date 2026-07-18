import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: { projects: { include: { transactions: true } } },
  });
  if (!client) return fail("Client tidak ditemukan", 404);

  const projects = client.projects.map((project) => {
    const totalIncome = project.transactions
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = project.transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + t.amount, 0);
    return {
      id: project.id,
      name: project.name,
      status: project.status,
      netIncome: totalIncome - totalExpense,
    };
  });

  return ok({
    id: client.id,
    name: client.name,
    contact: client.contact,
    status: client.status,
    notes: client.notes,
    projects,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, contact, status, notes } = await request.json();

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return fail("Client tidak ditemukan", 404);

  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(contact !== undefined && { contact: contact || null }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });

  return ok(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return fail("Client tidak ditemukan", 404);

  await prisma.client.delete({ where: { id } });

  return ok({ deleted: true });
}
