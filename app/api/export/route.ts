import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";

export async function GET() {
  const [projects, clients, wishlist] = await Promise.all([
    prisma.project.findMany({
      include: { transactions: true, client: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.client.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.wishlist.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return ok({
    exportedAt: new Date().toISOString(),
    projects: projects.map((p) => ({
      name: p.name,
      githubUrl: p.githubUrl,
      liveUrl: p.liveUrl,
      status: p.status,
      isActive: p.isActive,
      clientName: p.client?.name ?? null,
      transactions: p.transactions.map((t) => ({
        type: t.type,
        amount: t.amount,
        note: t.note,
        date: t.date,
      })),
    })),
    clients: clients.map((c) => ({
      name: c.name,
      contact: c.contact,
      status: c.status,
      notes: c.notes,
    })),
    wishlist: wishlist.map((w) => ({
      title: w.title,
      note: w.note,
      isAchieved: w.isAchieved,
      achievedAt: w.achievedAt,
    })),
  });
}
