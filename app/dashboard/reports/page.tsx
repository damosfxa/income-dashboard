"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface DailyData {
  day: number;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
}

interface YearlyData {
  year: number;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
}

export default function ReportsPage() {
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();

  // Load yearly data once
  useEffect(() => {
    const fetchYearly = async () => {
      try {
        const res = await fetch("/api/reports/yearly");
        if (res.status === 401) return router.push("/login");
        const data = await res.json();
        if (data.success) {
          setYearlyData(data.data);
          // Don't auto-set year to data[0] if user expects current year by default, 
          // but if we want to default to the newest data available:
          // if (data.data.length > 0 && !data.data.find(d => d.year === selectedYear)) {
          //   setSelectedYear(data.data[0].year);
          // }
        } else {
          setError(data.error || "Gagal memuat laporan tahunan");
        }
      } catch (err) {
        setError("Kesalahan jaringan");
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchYearly();
  }, [router]);

  // Load daily data when selectedYear or selectedMonth changes
  useEffect(() => {
    if (loadingInitial) return; 
    
    const fetchDaily = async () => {
      setLoadingDaily(true);
      try {
        const res = await fetch(`/api/reports/daily?year=${selectedYear}&month=${selectedMonth}`);
        if (res.status === 401) return router.push("/login");
        const data = await res.json();
        if (data.success && data.data) {
          setDailyData(data.data.days || []);
        } else {
          setDailyData([]);
        }
      } catch (err) {
        setError("Kesalahan memuat laporan harian");
      } finally {
        setLoadingDaily(false);
      }
    };
    fetchDaily();
  }, [selectedYear, selectedMonth, loadingInitial, router]);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatAbbreviatedRupiah = (amount: number) => {
    if (amount === 0) return "0";
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    if (abs >= 1000000) return `${sign}${+(abs / 1000000).toFixed(1)}jt`;
    if (abs >= 1000) return `${sign}${+(abs / 1000).toFixed(1)}rb`;
    return `${sign}${abs}`;
  };

  const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString("en-US", { month: "long" });
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  // --- Calendar Math ---
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay();
  // Adjust so Monday = 0, Sunday = 6
  const startingEmptyCells = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const calendarCells = [];
  for (let i = 0; i < startingEmptyCells; i++) {
    calendarCells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push(i);
  }
  const totalCells = Math.ceil(calendarCells.length / 7) * 7;
  while (calendarCells.length < totalCells) {
    calendarCells.push(null);
  }
  const weekDays = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  return (
    <div className="p-3 sm:p-6 lg:p-12 max-w-7xl mx-auto w-full">
      <header className="mb-4 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-100">Financial Reports</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 sm:mt-1">Analyze your daily PnL and yearly performance.</p>
        </div>
      </header>

      {error && (
        <div className="mb-3 sm:mb-6 flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-red-500/20 bg-red-500/10 p-3 sm:p-4 text-red-500">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <p className="text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {/* Daily PnL Calendar Section */}
      <div className="mb-4 sm:mb-10 rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3 sm:p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
            <h2 className="text-base sm:text-lg font-semibold text-zinc-100">Daily PnL Calendar</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center justify-center min-w-[120px] px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-sm font-medium text-zinc-100">
              {getMonthName(selectedMonth)} {selectedYear}
            </div>
            <button 
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {loadingDaily && <RefreshCw className="h-4 w-4 animate-spin text-zinc-500 ml-2" />}
          </div>
        </div>
        
        <div className="w-full pb-2">
          <div className="w-full">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-1 gap-0.5 sm:gap-1">
              {weekDays.map(day => (
                <div key={day} className="text-center text-[9px] sm:text-xs font-semibold text-zinc-500 py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {calendarCells.map((day, index) => {
                if (day === null) {
                  return (
                    <div key={`empty-${index}`} className="h-10 sm:h-16 rounded-md sm:rounded-lg bg-zinc-900/10 border border-transparent"></div>
                  );
                }

                // Ensure robust parsing (handling if the API returned string decimals like "0.00")
                const dayData = dailyData.find(d => Number(d.day) === day);
                const totalInc = dayData ? Number(dayData.totalIncome || 0) : 0;
                const totalExp = dayData ? Number(dayData.totalExpense || 0) : 0;
                const netInc = dayData ? Number(dayData.netIncome || 0) : 0;
                
                let bgColor = "bg-zinc-800/30 border-zinc-700/50"; // more visible neutral background
                let textColor = "text-zinc-500";
                if (netInc > 0) {
                  bgColor = "bg-emerald-500/10 border-emerald-500/30";
                  textColor = "text-emerald-400";
                } else if (netInc < 0) {
                  bgColor = "bg-red-500/10 border-red-500/30";
                  textColor = "text-red-400";
                } else if (totalInc > 0 || totalExp > 0) {
                  bgColor = "bg-blue-500/10 border-blue-500/30";
                  textColor = "text-blue-400";
                }

                const hasTransaction = totalInc > 0 || totalExp > 0 || netInc !== 0;

                return (
                  <div 
                    key={`day-${day}`} 
                    className={`relative flex flex-col justify-between p-1 sm:p-1.5 h-10 sm:h-16 rounded-md sm:rounded-lg border transition-colors hover:brightness-110 cursor-default ${bgColor}`}
                    title={dayData ? `Income: ${formatRupiah(totalInc)}\nExpense: ${formatRupiah(totalExp)}\nNet: ${formatRupiah(netInc)}` : "No transactions"}
                  >
                    <span className="text-[9px] sm:text-[10px] font-semibold text-zinc-400 leading-none">
                      {day}
                    </span>
                    <div className="flex items-end justify-end mt-auto">
                      {hasTransaction && (
                        <span className={`text-[8px] sm:text-[10px] font-bold tracking-tight truncate ${textColor}`}>
                          {formatAbbreviatedRupiah(netInc)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Yearly Recap Section */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-zinc-100 mb-2 sm:mb-4 px-1">Year-over-Year Summary</h2>
        {yearlyData.length === 0 ? (
          <div className="rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/10 py-6 sm:py-12 text-center text-zinc-500 text-xs sm:text-sm">
            Belum ada data laporan tahunan.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-zinc-950/50 text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 sm:px-6 sm:py-4 font-medium whitespace-nowrap">Year</th>
                    <th className="px-3 py-2 sm:px-6 sm:py-4 font-medium whitespace-nowrap">Total Income</th>
                    <th className="px-3 py-2 sm:px-6 sm:py-4 font-medium whitespace-nowrap">Total Expense</th>
                    <th className="px-3 py-2 sm:px-6 sm:py-4 font-medium whitespace-nowrap">Net Income</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {yearlyData.map((data) => (
                    <tr key={data.year} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-3 py-2 sm:px-6 sm:py-4 font-semibold text-zinc-200">{data.year}</td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 font-medium text-zinc-300 whitespace-nowrap">{formatRupiah(data.totalIncome)}</td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 font-medium text-zinc-300 whitespace-nowrap">{formatRupiah(data.totalExpense)}</td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 font-semibold whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 sm:gap-1.5 ${data.netIncome < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {data.netIncome < 0 ? <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                          {formatRupiah(data.netIncome)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
