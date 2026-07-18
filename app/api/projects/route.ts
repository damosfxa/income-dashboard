import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";

export async function GET(request: NextRequest) {
  const activeOnly = request.nextUrl.searchParams.get("active") === "true";

  const projects = await prisma.project.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    include: { transactions: true },
    orderBy: { createdAt: "desc" },
  });

  const data = projects.map((project) => {
    const totalIncome = project.transactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = project.transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      id: project.id,
      name: project.name,
      githubUrl: project.githubUrl,
      liveUrl: project.liveUrl,
      status: project.status,
      isActive: project.isActive,
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
      lastSyncedAt: project.lastSyncedAt,
    };
  });

  return ok(data);
}
