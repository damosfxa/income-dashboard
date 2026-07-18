"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  BarChart3,
  X
} from "lucide-react";
import { format } from "date-fns";
import { AlertDialog } from "@/components/ui/AlertDialog";

interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  note: string | null;
  date: string;
}

interface Project {
  id: string;
  name: string;
  status: "ONGOING" | "DONE";
  clientId?: string | null;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  
  const [project, setProject] = useState<Project | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientUpdating, setClientUpdating] = useState(false);
  const router = useRouter();

  // Dialog State
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    desc: string;
    type: "alert" | "confirm";
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    desc: "",
    type: "alert",
    onConfirm: () => {}
  });

  const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));
  const showAlert = (title: string, desc: string) => setDialog({
    isOpen: true, title, desc, type: "alert", onConfirm: closeDialog
  });

  // Form states
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txNote, setTxNote] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [projectsRes, txsRes, clientsRes] = await Promise.all([
        fetch("/api/projects?active=true"),
        fetch(`/api/projects/${projectId}/transactions`),
        fetch("/api/clients")
      ]);

      if (projectsRes.status === 401 || txsRes.status === 401 || clientsRes.status === 401) {
        router.push("/login");
        return;
      }

      const projectsData = await projectsRes.json();
      const txsData = await txsRes.json();
      const clientsData = await clientsRes.json();

      if (clientsData.success) {
        setClients(clientsData.data);
      }

      if (projectsData.success && txsData.success) {
        let foundProject = projectsData.data.find((p: Project) => p.id === projectId);
        if (!foundProject) {
          const allRes = await fetch("/api/projects");
          const allData = await allRes.json();
          if (allData.success) {
             foundProject = allData.data.find((p: Project) => p.id === projectId);
          }
        }
        
        if (foundProject) {
          setProject(foundProject);
          setTransactions(txsData.data);
        } else {
          setError("Project tidak ditemukan");
        }
      } else {
        setError(projectsData.error || txsData.error || "Gagal memuat data");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleStatusChange = async (newStatus: "ONGOING" | "DONE") => {
    if (!project || project.status === newStatus) return;
    
    const oldProject = { ...project };
    
    // Optimistic Update
    setProject({ ...project, status: newStatus });
    
    try {
      const res = await fetch(`/api/projects/${projectId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (res.status === 401) {
        setProject(oldProject);
        router.push("/login");
        return;
      }
      
      const data = await res.json();
      if (!data.success) {
        setProject(oldProject);
        showAlert("Gagal", data.error || "Gagal mengubah status");
      }
    } catch (err) {
      setProject(oldProject);
      showAlert("Error", "Terjadi kesalahan sistem");
    }
  };

  const handleClientChange = async (newClientId: string) => {
    if (!project) return;
    
    const oldProject = { ...project };
    setProject({ ...project, clientId: newClientId || null });
    setClientUpdating(true);
    
    try {
      const res = await fetch(`/api/projects/${projectId}/client`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: newClientId || null }),
      });
      
      if (res.status === 401) {
        setProject(oldProject);
        router.push("/login");
        return;
      }
      
      const data = await res.json();
      if (!data.success) {
        setProject(oldProject);
        showAlert("Gagal", data.error || "Gagal mengubah client");
      }
    } catch (err) {
      setProject(oldProject);
      showAlert("Error", "Terjadi kesalahan sistem");
    } finally {
      setClientUpdating(false);
    }
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setTxType(tx.type);
    setTxAmount(tx.amount.toString());
    setTxNote(tx.note || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingTxId(null);
    setTxType("INCOME");
    setTxAmount("");
    setTxNote("");
  };

  // Helper to adjust project totals locally
  const adjustProjectTotals = (proj: Project, oldTx: Transaction | null, newTx: Transaction | null): Project => {
    let income = proj.totalIncome;
    let expense = proj.totalExpense;
    
    // Remove old impact
    if (oldTx) {
      if (oldTx.type === "INCOME") income -= oldTx.amount;
      if (oldTx.type === "EXPENSE") expense -= oldTx.amount;
    }
    
    // Add new impact
    if (newTx) {
      if (newTx.type === "INCOME") income += newTx.amount;
      if (newTx.type === "EXPENSE") expense += newTx.amount;
    }
    
    return {
      ...proj,
      totalIncome: income,
      totalExpense: expense,
      netIncome: income - expense
    };
  };

  const handleAddOrEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    
    const amountNum = parseInt(txAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) return;
    
    const originalTransactions = [...transactions];
    const originalProject = { ...project };
    
    // Create local optimistic transaction representation
    const tempId = editingTxId || `temp-${Date.now()}`;
    const optimisticTx: Transaction = {
      id: tempId,
      type: txType,
      amount: amountNum,
      note: txNote,
      date: editingTxId 
        ? (transactions.find(t => t.id === editingTxId)?.date || new Date().toISOString()) 
        : new Date().toISOString()
    };
    
    const oldTx = editingTxId ? transactions.find(t => t.id === editingTxId) || null : null;

    // Optimistic Update UI
    if (editingTxId) {
      setTransactions(transactions.map(t => t.id === editingTxId ? optimisticTx : t));
    } else {
      setTransactions([...transactions, optimisticTx]);
    }
    
    setProject(adjustProjectTotals(project, oldTx, optimisticTx));
    cancelEdit(); // Reset form instantly

    try {
      const url = editingTxId 
        ? `/api/transactions/${editingTxId}` 
        : `/api/projects/${projectId}/transactions`;
      const method = editingTxId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: txType, amount: amountNum, note: txNote }),
      });
      
      if (res.status === 401) {
        setTransactions(originalTransactions);
        setProject(originalProject);
        router.push("/login");
        return;
      }

      const data = await res.json();
      if (!data.success) {
        setTransactions(originalTransactions);
        setProject(originalProject);
        showAlert("Gagal", data.error || "Gagal menyimpan transaksi");
      } else {
        // If it was a POST (Add), swap the temporary optimisticTx with the real one from API to get the correct DB ID and Date
        if (!editingTxId && data.data) {
          setTransactions(prev => prev.map(t => t.id === tempId ? data.data : t));
        }
      }
    } catch (err) {
      setTransactions(originalTransactions);
      setProject(originalProject);
      showAlert("Error", "Terjadi kesalahan sistem");
    }
  };

  const executeDelete = async (txId: string) => {
    if (!project) return;
    
    const originalTransactions = [...transactions];
    const originalProject = { ...project };
    const txToDelete = transactions.find(t => t.id === txId);
    
    if (!txToDelete) return;
    
    // Optimistic Update UI
    setTransactions(transactions.filter(t => t.id !== txId));
    setProject(adjustProjectTotals(project, txToDelete, null));

    try {
      const res = await fetch(`/api/transactions/${txId}`, { method: "DELETE" });
      if (res.status === 401) {
        setTransactions(originalTransactions);
        setProject(originalProject);
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!data.success) {
        setTransactions(originalTransactions);
        setProject(originalProject);
        showAlert("Gagal", data.error || "Gagal menghapus transaksi");
      }
    } catch (err) {
      setTransactions(originalTransactions);
      setProject(originalProject);
      showAlert("Error", "Terjadi kesalahan sistem");
    }
  };

  const promptDeleteTransaction = (txId: string) => {
    setDialog({
      isOpen: true,
      title: "Hapus Transaksi",
      desc: "Apakah kamu yakin ingin menghapus transaksi ini? Data yang dihapus tidak dapat dikembalikan.",
      type: "confirm",
      isDestructive: true,
      confirmText: "Hapus",
      onConfirm: () => {
        closeDialog();
        executeDelete(txId);
      }
    });
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMonthlyData = () => {
    const monthly: Record<string, { label: string, net: number, dateObj: Date }> = {};
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const key = format(d, "yyyy-MM");
      if (!monthly[key]) {
        monthly[key] = { label: format(d, "MMM yyyy"), net: 0, dateObj: d };
      }
      
      if (tx.type === "INCOME") monthly[key].net += tx.amount;
      else monthly[key].net -= tx.amount;
    });
    
    return Object.values(monthly).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  };

  if (loading && !project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-100">{error || "Project tidak ditemukan"}</h2>
        <Link href="/dashboard" className="mt-6 text-sm text-emerald-500 hover:underline">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const totalIncome = project.totalIncome;
  const totalExpense = project.totalExpense;
  const netIncome = project.netIncome;
  
  const monthlyData = getMonthlyData();
  const maxMonthlyAbs = Math.max(...monthlyData.map(d => Math.abs(d.net)), 1);

  return (
    <>
      <div className="min-h-screen p-3 sm:p-6 lg:p-12 max-w-5xl mx-auto w-full">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-zinc-400 hover:text-zinc-100 mb-4 sm:mb-8 transition-colors"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          Back to Dashboard
        </Link>

        {/* Header Section */}
        <header className="mb-4 sm:mb-10 flex flex-col md:flex-row md:items-start justify-between gap-4 sm:gap-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-100">{project.name}</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 sm:mt-1">Manage financial records for this project.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-zinc-400">Client:</span>
              <select
                value={project.clientId || ""}
                onChange={(e) => handleClientChange(e.target.value)}
                disabled={clientUpdating}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors max-w-[150px] truncate"
              >
                <option value="">-- No Client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {clientUpdating && <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm text-zinc-400">Status:</span>
              <select
                value={project.status}
                onChange={(e) => handleStatusChange(e.target.value as "ONGOING" | "DONE")}
                className={`rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                  project.status === "ONGOING" ? "text-blue-500" : "text-emerald-500"
                }`}
              >
                <option value="ONGOING">ONGOING</option>
                <option value="DONE">DONE</option>
              </select>
            </div>
          </div>
        </header>

        {/* Financial Summary */}
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-3 mb-4 sm:mb-10">
          <div className="rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
            <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-400 mb-1.5 sm:mb-2">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              <h3 className="text-xs sm:text-sm font-medium">Total Income</h3>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-zinc-100">{formatRupiah(totalIncome)}</p>
          </div>
          <div className="rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
            <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-400 mb-1.5 sm:mb-2">
              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
              <h3 className="text-xs sm:text-sm font-medium">Total Expense</h3>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-zinc-100">{formatRupiah(totalExpense)}</p>
          </div>
          <div className="rounded-xl sm:rounded-2xl border border-zinc-800 bg-emerald-500/5 p-4 sm:p-6 shadow-sm">
            <h3 className="text-xs sm:text-sm font-medium text-emerald-500/80 mb-1.5 sm:mb-2">Net Income</h3>
            <p className={`text-lg sm:text-2xl font-bold ${netIncome < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {formatRupiah(netIncome)}
            </p>
          </div>
        </div>

        {/* Monthly Chart */}
        {monthlyData.length > 0 && (
          <div className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-sm backdrop-blur-sm overflow-x-auto">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-medium text-zinc-100">Monthly Net Income</h2>
            </div>
            
            <div className="flex items-end gap-2 min-h-[160px] min-w-[500px]">
              {monthlyData.map((d) => (
                <div key={d.label} className="flex flex-col items-center gap-3 flex-1 h-full group">
                  <div className="relative w-full h-[120px] flex items-end justify-center rounded-sm bg-zinc-800/30">
                    <div 
                      className={`w-full max-w-[40px] rounded-t-sm transition-all relative ${d.net >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                      style={{ height: `${(Math.abs(d.net) / maxMonthlyAbs) * 100}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-100 shadow-xl z-10">
                        {formatRupiah(d.net)}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-zinc-500 whitespace-nowrap">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Transaction Form */}
          <div className="lg:col-span-1">
            <div className={`rounded-2xl border p-6 transition-colors ${editingTxId ? 'border-blue-500/50 bg-blue-500/5' : 'border-zinc-800 bg-zinc-900/50'}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-100">
                  {editingTxId ? "Edit Transaction" : "Add Transaction"}
                </h2>
                {editingTxId && (
                  <button onClick={cancelEdit} className="text-zinc-400 hover:text-zinc-100 p-1 rounded-full hover:bg-zinc-800 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <form onSubmit={handleAddOrEditTransaction} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType("INCOME")}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        txType === "INCOME" 
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" 
                          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      Income
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType("EXPENSE")}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                        txType === "EXPENSE" 
                          ? "border-red-500/50 bg-red-500/10 text-red-500" 
                          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      Expense
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">Amount (Rp)</label>
                  <input
                    type="text"
                    required
                    value={txAmount ? Number(txAmount).toLocaleString("id-ID") : ""}
                    onChange={(e) => setTxAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="3.000.000"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">Note (Optional)</label>
                  <input
                    type="text"
                    value={txNote}
                    onChange={(e) => setTxNote(e.target.value)}
                    placeholder="Payment milestone 1..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!txAmount || parseInt(txAmount, 10) <= 0}
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                    editingTxId 
                      ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500" 
                      : "bg-zinc-100 text-zinc-900 hover:bg-white focus:ring-zinc-500"
                  }`}
                >
                  {editingTxId ? (
                    <Pencil className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingTxId ? "Update Record" : "Add Record"}
                </button>
              </form>
            </div>
          </div>

          {/* Transactions List */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6">
              <h2 className="text-lg font-semibold text-zinc-100 mb-6">Recent Transactions</h2>
              
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
                  <p className="text-sm text-zinc-500">Belum ada transaksi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                      editingTxId === tx.id 
                        ? "border-blue-500/50 bg-blue-500/5" 
                        : "border-zinc-800/50 bg-zinc-900/40 hover:bg-zinc-800/60"
                    }`}>
                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          tx.type === "INCOME" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                        }`}>
                          {tx.type === "INCOME" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-200">
                            {tx.note || (tx.type === "INCOME" ? "Income" : "Expense")}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {format(new Date(tx.date), "dd MMM yyyy, HH:mm")}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold mr-2 ${tx.type === "INCOME" ? "text-emerald-500" : "text-red-500"}`}>
                          {tx.type === "INCOME" ? "+" : "-"}{formatRupiah(tx.amount)}
                        </span>
                        <button
                          onClick={() => handleEditClick(tx)}
                          className="rounded-lg p-2 text-zinc-500 hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                          title="Edit transaction"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => promptDeleteTransaction(tx.id)}
                          className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog 
        isOpen={dialog.isOpen}
        title={dialog.title}
        description={dialog.desc}
        type={dialog.type}
        isDestructive={dialog.isDestructive}
        confirmText={dialog.confirmText}
        onConfirm={dialog.onConfirm}
        onCancel={closeDialog}
      />
    </>
  );
}
