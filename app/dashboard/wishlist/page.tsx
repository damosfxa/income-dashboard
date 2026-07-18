"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, CheckCircle2, Circle, AlertCircle, RefreshCw, CheckSquare } from "lucide-react";
import { format } from "date-fns";

interface WishlistItem {
  id: string;
  title: string;
  note: string | null;
  isAchieved: boolean;
  achievedAt: string | null;
  createdAt: string;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const router = useRouter();

  const fetchWishlist = async () => {
    try {
      const res = await fetch("/api/wishlist");
      if (res.status === 401) return router.push("/login");
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      } else {
        setError(data.error || "Gagal memuat wishlist");
      }
    } catch (err) {
      setError("Kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleToggle = async (item: WishlistItem) => {
    const original = [...items];
    const updatedStatus = !item.isAchieved;
    const optimisticAchievedAt = updatedStatus ? new Date().toISOString() : null;
    
    setItems(items.map(i => i.id === item.id ? { ...i, isAchieved: updatedStatus, achievedAt: optimisticAchievedAt } : i));
    
    try {
      const res = await fetch(`/api/wishlist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAchieved: updatedStatus })
      });
      if (res.status === 401) return router.push("/login");
      const data = await res.json();
      if (!data.success) setItems(original);
    } catch (err) {
      setItems(original);
    }
  };

  const handleDelete = async (id: string) => {
    const original = [...items];
    setItems(items.filter(i => i.id !== id));
    try {
      const res = await fetch(`/api/wishlist/${id}`, { method: "DELETE" });
      if (res.status === 401) return router.push("/login");
      const data = await res.json();
      if (!data.success) setItems(original);
    } catch (err) {
      setItems(original);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    setSubmitting(true);
    const original = [...items];
    const tempId = `temp-${Date.now()}`;
    const newItem: WishlistItem = {
      id: tempId,
      title: newTitle,
      note: newNote || null,
      isAchieved: false,
      achievedAt: null,
      createdAt: new Date().toISOString()
    };
    
    setItems([newItem, ...items]);
    setNewTitle("");
    setNewNote("");
    
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newItem.title, note: newItem.note })
      });
      if (res.status === 401) return router.push("/login");
      const data = await res.json();
      if (data.success && data.data) {
        setItems(prev => prev.map(i => i.id === tempId ? data.data : i));
      } else {
        setItems(original);
      }
    } catch (err) {
      setItems(original);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 lg:p-12 max-w-4xl mx-auto w-full">
      <header className="mb-4 sm:mb-10">
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-100">Wishlist</h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 sm:mt-1">Track your goals and planned purchases.</p>
      </header>

      {error && (
        <div className="mb-3 sm:mb-6 flex items-center gap-2 sm:gap-3 rounded-lg sm:rounded-xl border border-red-500/20 bg-red-500/10 p-3 sm:p-4 text-red-500">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <p className="text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {/* Add New Item Form */}
      <div className="mb-4 sm:mb-8 rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3 sm:p-6 shadow-sm backdrop-blur-sm">
        <form onSubmit={handleAdd}>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              required
              placeholder="What do you want to achieve or buy?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
            <input
              type="text"
              placeholder="Optional notes..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
            <button
              type="submit"
              disabled={submitting || !newTitle.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-6 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 transition-colors shrink-0"
            >
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Item
            </button>
          </div>
        </form>
      </div>

      {/* Wishlist Items */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10 py-12 sm:py-24 text-center">
          <CheckSquare className="h-10 w-10 sm:h-12 sm:w-12 text-zinc-600 mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-zinc-200">No items yet</h3>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-sm px-4">
            Start adding items to your wishlist using the form above.
          </p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {items.map((item) => (
            <div 
              key={item.id} 
              className={`group flex items-start gap-3 sm:gap-4 rounded-xl border p-3 sm:p-4 transition-all duration-200 ${
                item.isAchieved 
                  ? "border-zinc-800/30 bg-zinc-900/20 opacity-60 hover:opacity-100" 
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              }`}
            >
              <button
                onClick={() => handleToggle(item)}
                className="mt-0.5 shrink-0 text-zinc-500 hover:text-emerald-500 transition-colors focus:outline-none"
              >
                {item.isAchieved ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm sm:text-base font-medium transition-all ${
                  item.isAchieved ? "text-zinc-500 line-through" : "text-zinc-200"
                }`}>
                  {item.title}
                </p>
                {item.note && (
                  <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 ${item.isAchieved ? "text-zinc-600 line-through" : "text-zinc-400"}`}>
                    {item.note}
                  </p>
                )}
                {item.isAchieved && item.achievedAt && (
                  <p className="text-[10px] sm:text-xs text-emerald-500/70 mt-1 sm:mt-2 font-medium">
                    Achieved on {format(new Date(item.achievedAt), "dd MMM yyyy")}
                  </p>
                )}
              </div>
              
              <button
                onClick={() => handleDelete(item.id)}
                className="shrink-0 rounded-lg p-2 text-zinc-600 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all focus:outline-none focus:opacity-100"
                title="Delete item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// CheckSquare needs to be imported, I forgot to import it in lucide-react. Wait, I imported CheckCircle2, Circle but not CheckSquare.
