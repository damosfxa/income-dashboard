import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";

export async function GET() {
  const transactions = await prisma.transaction.findMany({
    where: { project: { isActive: true } },
  });

  const byYear = new Map<number, { totalIncome: number; totalExpense: number }>();

  for (const t of transactions) {
    const year = t.date.getUTCFullYear();
    if (!byYear.has(year)) {
      byYear.set(year, { totalIncome: 0, totalExpense: 0 });
    }
    const entry = byYear.get(year)!;
    if (t.type === "INCOME") {
      entry.totalIncome += t.amount;
    } else {
      entry.totalExpense += t.amount;
    }
  }

  const data = Array.from(byYear.entries())
    .map(([year, { totalIncome, totalExpense }]) => ({
      year,
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
    }))
    .sort((a, b) => b.year - a.year);

  return ok(data);
}
