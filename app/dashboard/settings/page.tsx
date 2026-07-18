"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  UserCircle
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { AlertDialog } from "@/components/ui/AlertDialog";

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [exporting, setExporting] = useState(false);
  const router = useRouter();

  const [dialog, setDialog] = useState({
    isOpen: false,
    title: "",
    desc: ""
  });
  const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));
  const showAlert = (title: string, desc: string) => setDialog({ isOpen: true, title, desc });

  useEffect(() => {
    setUserEmail(localStorage.getItem("userEmail") || "admin@gmail.com");
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Gagal export data");
      
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal mengambil data dari server");
      
      const data = json.data;
      const activeProjects = data.projects.filter((p: any) => p.isActive);
      
      // Projects
      const projectsSheetData = activeProjects.map((p: any) => {
        const totalIncome = p.transactions.filter((t: any) => t.type === "INCOME").reduce((sum: number, t: any) => sum + t.amount, 0);
        const totalExpense = p.transactions.filter((t: any) => t.type === "EXPENSE").reduce((sum: number, t: any) => sum + t.amount, 0);
        const netIncome = totalIncome - totalExpense;

        return {
          "Nama": p.name,
          "GitHub URL": p.githubUrl || "-",
          "Live URL": p.liveUrl || "-",
          "Status": p.status,
          "Aktif": p.isActive ? "Ya" : "Tidak",
          "Client": p.clientName || "-",
          "Total Income": totalIncome,
          "Total Expense": totalExpense,
          "Net Income": netIncome,
        };
      });

      // Transactions
      const transactionsSheetData: any[] = [];
      activeProjects.forEach((p: any) => {
        p.transactions.forEach((t: any) => {
          transactionsSheetData.push({
            "Nama Project": p.name,
            "Tipe": t.type,
            "Nominal": t.amount,
            "Catatan": t.note || "-",
            "Tanggal": new Date(t.date).toISOString().split('T')[0]
          });
        });
      });

      // Clients
      const clientsSheetData = data.clients.map((c: any) => ({
        "Nama": c.name,
        "Kontak": c.contact || "-",
        "Status": c.status,
        "Catatan": c.notes || "-"
      }));

      // Wishlist
      const wishlistSheetData = data.wishlist.map((w: any) => ({
        "Judul": w.title,
        "Catatan": w.note || "-",
        "Tercapai (Ya/Tidak)": w.isAchieved ? "Ya" : "Tidak",
        "Tanggal Tercapai": w.achievedAt ? new Date(w.achievedAt).toISOString().split('T')[0] : "-"
      }));

      const wsProjects = XLSX.utils.json_to_sheet(projectsSheetData);
      const wsTransactions = XLSX.utils.json_to_sheet(transactionsSheetData);
      const wsClients = XLSX.utils.json_to_sheet(clientsSheetData);
      const wsWishlist = XLSX.utils.json_to_sheet(wishlistSheetData);

      // Apply Number Formatting
      for (let R = 1; R <= projectsSheetData.length; R++) {
        ['G', 'H', 'I'].forEach(C => {
          const cellRef = `${C}${R + 1}`;
          if (wsProjects[cellRef]) wsProjects[cellRef].z = "#,##0";
        });
      }
      for (let R = 1; R <= transactionsSheetData.length; R++) {
        const cellRef = `C${R + 1}`;
        if (wsTransactions[cellRef]) wsTransactions[cellRef].z = "#,##0";
      }

      const autoFitCols = (dataArray: any[]) => {
        if (dataArray.length === 0) return [];
        const keys = Object.keys(dataArray[0]);
        return keys.map(key => {
          const maxLen = Math.max(
            key.length,
            ...dataArray.map(row => (row[key] ? row[key].toString().length : 0))
          );
          return { wch: maxLen + 2 };
        });
      };

      wsProjects["!cols"] = autoFitCols(projectsSheetData);
      wsTransactions["!cols"] = autoFitCols(transactionsSheetData);
      wsClients["!cols"] = autoFitCols(clientsSheetData);
      wsWishlist["!cols"] = autoFitCols(wishlistSheetData);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsProjects, "Projects");
      XLSX.utils.book_append_sheet(wb, wsTransactions, "Transactions");
      XLSX.utils.book_append_sheet(wb, wsClients, "Clients");
      XLSX.utils.book_append_sheet(wb, wsWishlist, "Wishlist");

      XLSX.writeFile(wb, `income-dashboard-backup-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    } catch (err) {
      console.error(err);
      showAlert("Export Gagal", "Terjadi kesalahan saat export data Excel");
    } finally {
      setExporting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      if (res.status === 401) {
        // Bisa berarti unauthorized/belum login, atau password lama salah.
        // Kita parse dulu res.json
        const data = await res.json();
        if (data.error === "Belum login") {
           router.push("/login");
           return;
        }
        setError(data.error || "Password lama salah");
        return;
      }
      
      if (res.status === 400) {
        const data = await res.json();
        setError(data.error || "Validasi gagal");
        return;
      }

      const data = await res.json();
      if (data.success) {
        setSuccess("Password berhasil diubah");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setError(data.error || "Gagal mengubah password");
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-12 max-w-3xl mx-auto w-full">
      <Link 
        href="/dashboard" 
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 mb-8 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <header className="mb-4 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-100">Settings</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 sm:mt-1">Manage your account preferences and security.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-zinc-800 px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50 shrink-0"
        >
          {exporting ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Download className="h-3 w-3 sm:h-4 sm:w-4" />}
          Export Data
        </button>
      </header>

      <div className="space-y-4 sm:space-y-6">
        {/* Account Info */}
        <div className="rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400">
              <UserCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-semibold text-zinc-100">Account Information</h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">Logged in as <span className="text-zinc-300 font-medium">{userEmail}</span></p>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Change Password</h2>
            <p className="text-sm text-zinc-500">Update your account password to stay secure.</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-500">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              placeholder="Minimum 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !currentPassword || !newPassword}
            className="mt-4 sm:mt-6 flex items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-zinc-100 px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-zinc-900 hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : "Update Password"}
          </button>
        </form>
        </div>
      </div>

      <AlertDialog 
        isOpen={dialog.isOpen} 
        title={dialog.title} 
        description={dialog.desc} 
        onConfirm={closeDialog} 
        onCancel={closeDialog} 
      />
    </div>
  );
}
