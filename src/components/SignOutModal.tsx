"use client";

import React, { useEffect, useState } from "react";
import { LogOut, X, ShieldCheck, AlertTriangle } from "lucide-react";
import { executeSignOut } from "@/lib/auth";

interface SignOutModalProps {
  onClose: () => void;
}

export function SignOutModal({ onClose }: SignOutModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).isGenerating) {
      setIsGenerating(true);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleConfirm = () => {
    executeSignOut({ reload: true });
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-md bg-bg-panel border border-border-color rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signout-modal-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-border-subtle flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
              <LogOut size={18} />
            </div>
            <div>
              <h3 id="signout-modal-title" className="font-semibold text-text-primary tracking-tight text-base">
                Sign Out
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Flush authentication session
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            Are you sure you want to sign out of GenVoice Studio?
          </p>

          {/* Active Generation Warning */}
          {isGenerating && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-400 leading-relaxed">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> You currently have an active generation in progress. Signing out will cancel it.
              </span>
            </div>
          )}

          {/* Data Preservation Assurance */}
          <div className="p-3.5 bg-accent-bg/5 border border-accent-bg/15 rounded-xl flex items-start gap-2.5 text-xs text-text-secondary leading-relaxed">
            <ShieldCheck size={17} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-text-primary block mb-0.5">Your library is preserved</span>
              <span>
                Your authentication tokens will be cleared, but all your generated audio files, custom voices, and library items will remain safely stored on this device.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border-subtle flex items-center justify-end gap-2.5 bg-bg-panel/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border-color rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-medium text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] rounded-xl transition-all shadow-sm flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
