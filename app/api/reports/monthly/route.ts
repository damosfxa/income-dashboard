import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  if (isNaN(year)) {
    return fail("Parameter year tidak valid", 400);
  }

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: start, lt: end },
      project: { isActive: true },
    },
  });

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    totalIncome: 0,
    totalExpense: 0,
    netIncome: 0,
  }));

  for (const t of transactions) {
    const monthIndex = t.date.getUTCMonth();
    if (t.type === "INCOME") {
      months[monthIndex].totalIncome += t.amount;
    } else {
      months[monthIndex].totalExpense += t.amount;
    }
  }

  for (const m of months) {
    m.netIncome = m.totalIncome - m.totalExpense;
  }

  return ok({ year, months });
}
