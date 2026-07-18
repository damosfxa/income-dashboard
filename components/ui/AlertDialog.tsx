"use client";

import { useEffect } from "react";

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  type?: "alert" | "confirm";
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function AlertDialog({
  isOpen,
  title,
  description,
  type = "alert",
  confirmText = "OK",
  cancelText = "Batal",
  onConfirm,
  onCancel,
  isDestructive = false
}: AlertDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity" 
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200" 
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h2>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{description}</p>
        <div className="flex justify-end gap-3">
          {type === "confirm" && (
            <button 
              onClick={onCancel} 
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button 
            onClick={onConfirm} 
            className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-zinc-100 !text-zinc-900 hover:bg-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
