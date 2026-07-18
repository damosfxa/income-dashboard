import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";

export async function GET() {
  const clients = await prisma.client.findMany({
    include: { projects: { include: { transactions: true } } },
    orderBy: { createdAt: "desc" },
  });

  const data = clients.map((client) => {
    const totalIncome = client.projects.reduce((sum, project) => {
      const income = project.transactions
        .filter((t) => t.type === "INCOME")
        .reduce((s, t) => s + t.amount, 0);
      return sum + income;
    }, 0);

    return {
      id: client.id,
      name: client.name,
      contact: client.contact,
      status: client.status,
      notes: client.notes,
      projectCount: client.projects.length,
      totalIncome,
      createdAt: client.createdAt,
    };
  });

  return ok(data);
}

export async function POST(request: Request) {
  const { name, contact, status, notes } = await request.json();

  if (!name || !name.trim()) {
    return fail("Nama client wajib diisi", 400);
  }

  const client = await prisma.client.create({
    data: {
      name,
      contact: contact || null,
      status: status || "PROSPECT",
      notes: notes || null,
    },
  });

  return ok(client, 201);
}
