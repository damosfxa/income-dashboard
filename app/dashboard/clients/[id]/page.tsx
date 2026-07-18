"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, FolderGit2, AlertCircle, RefreshCw, ArrowRight, Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { AlertDialog } from "@/components/ui/AlertDialog";

interface ProjectPreview {
  id: string;
  name: string;
  status: "ONGOING" | "DONE";
  netIncome: number;
}

interface ClientDetail {
  id: string;
  name: string;
  contact: string | null;
  status: "PROSPECT" | "ONGOING" | "DONE";
  notes: string | null;
  projects: ProjectPreview[];
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;
  
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editStatus, setEditStatus] = useState<"PROSPECT" | "ONGOING" | "DONE">("PROSPECT");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleting, setDeleting] = useState(false);

  // General Dialog State
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
  
  const showConfirmDelete = () => setDialog({
    isOpen: true,
    title: "Hapus Client",
    desc: "Apakah Anda yakin ingin menghapus client ini? Semua project yang terkait tidak akan ikut terhapus, tetapi client-nya akan menjadi kosong.",
    type: "confirm",
    isDestructive: true,
    confirmText: "Ya, Hapus",
    onConfirm: executeDelete
  });

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}`);
        if (res.status === 401) return router.push("/login");
        const data = await res.json();
        if (data.success) {
          setClient(data.data);
          setEditName(data.data.name);
          setEditContact(data.data.contact || "");
          setEditStatus(data.data.status);
          setEditNotes(data.data.notes || "");
        } else {
          setError(data.error || "Client tidak ditemukan");
        }
      } catch (err) {
        setError("Kesalahan jaringan");
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [clientId, router]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !client) return;
    
    setSaving(true);
    const original = { ...client };
    const updated = {
      ...client,
      name: editName,
      contact: editContact || null,
      status: editStatus,
      notes: editNotes || null
    };
    
    setClient(updated);
    setIsEditModalOpen(false);
    
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: updated.name,
          contact: updated.contact,
          status: updated.status,
          notes: updated.notes
        })
      });
      if (res.status === 401) return router.push("/login");
      const data = await res.json();
      if (!data.success) {
        setClient(original);
        showAlert("Gagal", data.error || "Gagal menyimpan");
      }
    } catch (err) {
      setClient(original);
      showAlert("Error", "Kesalahan jaringan");
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    setDeleting(true);
    // Update confirm text immediately to show loading state
    setDialog(prev => ({ ...prev, confirmText: "Menghapus..." }));
    
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (res.status === 401) return router.push("/login");
      const data = await res.json();
      if (data.success) {
        router.push("/dashboard/clients");
      } else {
        showAlert("Gagal", data.error || "Gagal menghapus client");
        setDeleting(false);
      }
    } catch (err) {
      showAlert("Error", "Kesalahan sistem");
      setDeleting(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && !client) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-100">{error || "Client tidak ditemukan"}</h2>
        <Link href="/dashboard/clients" className="mt-6 text-sm text-emerald-500 hover:underline">
          Kembali ke Clients
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === "ONGOING") return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
    if (status === "DONE") return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
    return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
  };

  return (
    <>
      <div className="p-3 sm:p-6 lg:p-12 max-w-5xl mx-auto w-full">
        <Link 
          href="/dashboard/clients" 
          className="inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-zinc-400 hover:text-zinc-100 mb-4 sm:mb-8 transition-colors"
        >
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          Back to Clients
        </Link>

        {/* Header Section */}
        <header className="mb-4 sm:mb-10 rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 sm:gap-6">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                <span className={`inline-flex items-center rounded-full px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold ${getStatusColor(client.status)}`}>
                  {client.status}
                </span>
              </div>
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-100">{client.name}</h1>
              {client.contact && (
                <p className="text-xs sm:text-sm text-zinc-400 mt-1 sm:mt-2">Contact: {client.contact}</p>
              )}
              {client.notes && (
                <p className="text-xs sm:text-sm text-zinc-500 mt-2 sm:mt-4 leading-relaxed max-w-2xl">{client.notes}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-zinc-800 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                Edit
              </button>
              <button
                onClick={showConfirmDelete}
                className="flex items-center justify-center rounded-lg sm:rounded-xl border border-red-500/20 bg-red-500/10 p-1.5 sm:p-2 text-red-500 hover:bg-red-500/20 transition-colors"
                title="Delete Client"
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Projects Section */}
        <div className="mb-3 sm:mb-6 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-zinc-100">Associated Projects</h2>
          <span className="text-xs sm:text-sm text-zinc-500 font-medium bg-zinc-900 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-zinc-800">
            {client.projects.length} Total
          </span>
        </div>

        {client.projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10 py-10 sm:py-16 text-center">
            <FolderGit2 className="h-8 w-8 sm:h-10 sm:w-10 text-zinc-600 mb-2 sm:mb-3" />
            <p className="text-xs sm:text-sm text-zinc-500 px-4">Belum ada project yang tertaut dengan client ini.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {client.projects.map((proj) => (
              <div key={proj.id} className="group flex flex-col rounded-lg sm:rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 sm:p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900/60">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="font-medium text-sm sm:text-base text-zinc-100 line-clamp-1">{proj.name}</h3>
                  <span className={`text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded ${proj.status === 'ONGOING' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {proj.status}
                  </span>
                </div>
                <div className="mt-auto pt-2 sm:pt-3 flex items-center justify-between border-t border-zinc-800/50">
                  <span className={`font-semibold text-xs sm:text-sm ${proj.netIncome < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {formatRupiah(proj.netIncome)}
                  </span>
                  <Link
                    href={`/dashboard/${proj.id}`}
                    className="text-zinc-500 hover:text-white transition-colors p-1"
                  >
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Client"
        description="Update client details."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Contact / Email (Optional)</label>
            <input
              type="text"
              value={editContact}
              onChange={(e) => setEditContact(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as "PROSPECT" | "ONGOING" | "DONE")}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            >
              <option value="PROSPECT">PROSPECT</option>
              <option value="ONGOING">ONGOING</option>
              <option value="DONE">DONE</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Notes (Optional)</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !editName.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 transition-colors"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </form>
      </Modal>

      <AlertDialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        description={dialog.desc}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        onCancel={closeDialog}
        isDestructive={dialog.isDestructive}
        confirmText={dialog.confirmText}
      />
    </>
  );
}
