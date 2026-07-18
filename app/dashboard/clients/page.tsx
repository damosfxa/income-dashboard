"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Users, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface Client {
  id: string;
  name: string;
  contact: string | null;
  status: "PROSPECT" | "ONGOING" | "DONE";
  notes: string | null;
  projectCount: number;
  totalIncome: number;
  createdAt: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newStatus, setNewStatus] = useState<"PROSPECT" | "ONGOING" | "DONE">("PROSPECT");
  const [newNotes, setNewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const router = useRouter();

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.status === 401) return router.push("/login");
      const data = await res.json();
      if (data.success) {
        setClients(data.data);
      } else {
        setError(data.error || "Gagal memuat clients");
      }
    } catch (err) {
      setError("Kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    setSubmitting(true);
    const tempId = `temp-${Date.now()}`;
    const newClient: Client = {
      id: tempId,
      name: newName,
      contact: newContact || null,
      status: newStatus,
      notes: newNotes || null,
      projectCount: 0,
      totalIncome: 0,
      createdAt: new Date().toISOString()
    };
    
    const original = [...clients];
    setClients([newClient, ...clients]);
    setIsModalOpen(false);
    
    // reset form
    setNewName("");
    setNewContact("");
    setNewStatus("PROSPECT");
    setNewNotes("");
    
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newClient.name, 
          contact: newClient.contact,
          status: newClient.status,
          notes: newClient.notes
        })
      });
      if (res.status === 401) return router.push("/login");
      const data = await res.json();
      if (data.success && data.data) {
        setClients(prev => prev.map(c => c.id === tempId ? { ...data.data, projectCount: 0, totalIncome: 0 } : c));
      } else {
        setClients(original);
      }
    } catch (err) {
      setClients(original);
    } finally {
      setSubmitting(false);
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

  if (loading && clients.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === "ONGOING") return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
    if (status === "DONE") return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
    return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
  };

  return (
    <div className="p-3 sm:p-6 lg:p-12 max-w-7xl mx-auto w-full">
      <header className="mb-4 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-100">Clients</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 sm:mt-1">Manage your clients and their associated projects.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-zinc-100 px-4 py-2 sm:py-2.5 text-sm font-medium text-zinc-900 hover:bg-white transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </header>

      {error && (
        <div className="mb-3 sm:mb-6 flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-red-500/20 bg-red-500/10 p-3 sm:p-4 text-red-500">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <p className="text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10 py-12 sm:py-24 text-center">
          <Users className="h-10 w-10 sm:h-12 sm:w-12 text-zinc-600 mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-zinc-200">No clients found</h3>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-sm px-4">
            Add your first client to start tracking their projects and income.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="group flex flex-col rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6 transition-all hover:border-zinc-700 hover:bg-zinc-900/60"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-col items-start gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(client.status)}`}>
                    {client.status}
                  </span>
                  <h3 className="font-semibold text-zinc-100 line-clamp-1" title={client.name}>
                    {client.name}
                  </h3>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-zinc-500 mb-1">Total Income</p>
                <p className="font-medium text-zinc-200">{formatRupiah(client.totalIncome)}</p>
              </div>

              <div className="mt-auto pt-4 flex items-center justify-between border-t border-zinc-800/50">
                <span className="text-xs font-medium text-zinc-500">
                  {client.projectCount} {client.projectCount === 1 ? 'Project' : 'Projects'}
                </span>
                
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Client"
        description="Enter the details of your new client."
      >
        <form onSubmit={handleAddClient} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Name</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="PT Contoh or John Doe"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Contact / Email (Optional)</label>
            <input
              type="text"
              value={newContact}
              onChange={(e) => setNewContact(e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as "PROSPECT" | "ONGOING" | "DONE")}
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
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={3}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !newName.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 transition-colors"
          >
            {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save Client
          </button>
        </form>
      </Modal>
    </div>
  );
}
