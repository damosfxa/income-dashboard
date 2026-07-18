"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  RefreshCw, 
  FolderGit2, 
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Settings2,
  AlertCircle,
  Search,
  BarChart3
} from "lucide-react";
import { AlertDialog } from "@/components/ui/AlertDialog";

interface Project {
  id: string;
  name: string;
  githubUrl: string;
  liveUrl: string | null;
  status: "ONGOING" | "DONE";
  isActive: boolean;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  lastSyncedAt: string;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  
  const [dialog, setDialog] = useState({ isOpen: false, title: "", desc: "" });
  const closeDialog = () => setDialog(prev => ({ ...prev, isOpen: false }));
  const showAlert = (title: string, desc: string) => setDialog({ isOpen: true, title, desc });

  const router = useRouter();

  const fetchProjects = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch ALL projects once. We filter active ones on the client side.
      const res = await fetch("/api/projects");
      
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
      } else {
        setError(data.error || "Gagal memuat project");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/projects/sync", { method: "POST" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data.success) {
        await fetchProjects();
      } else {
        showAlert("Sync Gagal", data.error || "Gagal sync dengan GitHub");
      }
    } catch (err) {
      showAlert("Error", "Terjadi kesalahan saat sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    const originalProjects = [...projects];
    
    // Optimistic update
    setProjects(projects.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
    
    try {
      const res = await fetch(`/api/projects/${id}/toggle`, { method: "PATCH" });
      if (res.status === 401) {
        setProjects(originalProjects); // Rollback
        router.push("/login");
        return;
      }
      
      const data = await res.json();
      if (!data.success) {
        setProjects(originalProjects); // Rollback
        showAlert("Gagal", data.error || "Gagal mengubah status project");
      }
    } catch (err) {
      setProjects(originalProjects); // Rollback
      showAlert("Error", "Terjadi kesalahan koneksi");
    }
  };

  const baseProjects = showAll ? projects : projects.filter(p => p.isActive);

  const totalNetIncome = baseProjects.reduce((acc, p) => acc + p.netIncome, 0);

  const filteredProjects = baseProjects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topProjects = [...baseProjects]
    .filter(p => p.netIncome > 0)
    .sort((a, b) => b.netIncome - a.netIncome)
    .slice(0, 5);

  const maxIncome = Math.max(...topProjects.map(p => p.netIncome), 1);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen p-3 sm:p-6 lg:p-12 max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <header className="mb-4 sm:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-100">Overview</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 sm:mt-1">Manage your projects and track net income.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <Settings2 className="h-4 w-4" />
              {showAll ? "Show Active Only" : "Manage All Projects"}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sync GitHub
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid gap-3 sm:gap-6 lg:grid-cols-3 mb-4 sm:mb-10">
          <div className="lg:col-span-1 rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-8 shadow-sm backdrop-blur-sm flex flex-col justify-center">
            <h2 className="text-xs sm:text-sm font-medium text-zinc-400">Total Net Income (Displayed)</h2>
            <div className="mt-1 sm:mt-2 flex items-baseline gap-2">
              <span className={`text-2xl sm:text-4xl font-bold tracking-tight ${totalNetIncome < 0 ? 'text-red-500' : 'text-zinc-100'}`}>
                {formatRupiah(totalNetIncome)}
              </span>
            </div>
          </div>

          {/* Top Projects Chart */}
          <div className="lg:col-span-2 rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2 sm:mb-4">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              <h2 className="text-xs sm:text-sm font-medium text-zinc-100">Top Projects by Net Income</h2>
            </div>
            
            {topProjects.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4">No positive net income projects found.</p>
            ) : (
              <div className="space-y-3">
                {topProjects.map((project) => (
                  <div key={project.id} className="flex items-center gap-4">
                    <span className="w-32 text-xs font-medium text-zinc-400 truncate" title={project.name}>
                      {project.name}
                    </span>
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(project.netIncome / maxIncome) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 text-right text-xs font-semibold text-zinc-100">
                      {formatRupiah(project.netIncome)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showAll && (
          <div className="mb-3 sm:mb-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search projects by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-96 rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>
        )}

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10 py-12 sm:py-24 text-center">
            <FolderGit2 className="h-10 w-10 sm:h-12 sm:w-12 text-zinc-600 mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-zinc-200">No projects found</h3>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-sm px-4">
              {searchQuery ? "No projects match your search." : (showAll ? "Sync with GitHub to import your repositories." : "You have no active projects. Click 'Manage All Projects' to activate some.")}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className={`group relative flex flex-col rounded-xl sm:rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden p-4 sm:p-5 ${
                  !project.isActive 
                    ? "border-zinc-800/50 bg-zinc-900/20 opacity-70 hover:opacity-100 hover:border-zinc-700" 
                    : "border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800/40 hover:border-zinc-700"
                }`}
                onClick={() => router.push(`/dashboard/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-col items-start gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      project.status === 'ONGOING' 
                        ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    }`}>
                      {project.status}
                    </span>
                    <h3 className="font-semibold text-zinc-100 line-clamp-1" title={project.name}>
                      {project.name}
                    </h3>
                  </div>
                  
                  {showAll && (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={project.isActive}
                        onChange={() => handleToggleActive(project.id)}
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  )}
                </div>

                <div className="mt-auto pt-3 sm:pt-4 flex items-center justify-between border-t border-zinc-800/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] sm:text-xs text-zinc-500">Net Income</span>
                    <span className={`text-xs sm:text-sm font-bold ${project.netIncome < 0 ? 'text-red-500' : 'text-zinc-100'}`}>
                      {formatRupiah(project.netIncome)}
                    </span>
                  </div>
                  <div className="rounded-full bg-zinc-800/50 p-1.5 sm:p-2 text-zinc-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors">
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Global Alerts for Dashboard */}
      <AlertDialog 
        isOpen={dialog.isOpen}
        title={dialog.title}
        description={dialog.desc}
        onConfirm={closeDialog}
        onCancel={closeDialog}
      />
    </>
  );
}
