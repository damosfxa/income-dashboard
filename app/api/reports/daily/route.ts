import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/response";

export async function GET(request: NextRequest) {
  const yearParam = request.nextUrl.searchParams.get("year");
  const monthParam = request.nextUrl.searchParams.get("month");

  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  const month = monthParam ? parseInt(monthParam, 10) : new Date().getMonth() + 1;

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return fail("Parameter year/month tidak valid", 400);
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const transactions = await prisma.transaction.findMany({
    where: {
      date: { gte: start, lt: end },
      project: { isActive: true },
    },
  });

  const days = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    totalIncome: 0,
    totalExpense: 0,
    netIncome: 0,
  }));

  for (const t of transactions) {
    const dayIndex = t.date.getUTCDate() - 1;
    if (t.type === "INCOME") {
      days[dayIndex].totalIncome += t.amount;
    } else {
      days[dayIndex].totalExpense += t.amount;
    }
  }

  for (const d of days) {
    d.netIncome = d.totalIncome - d.totalExpense;
  }

  return ok({ year, month, days });
}
