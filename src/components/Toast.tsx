"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

type ToastType = "error" | "success" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  toastError: (message: string) => void;
  toastSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Accept removeToast function directly to avoid timer reset on re-renders
function ToastItem({
  toast,
  removeToast,
}: {
  toast: Toast;
  removeToast: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  const bgClass = {
    error: "bg-red-500/95 border-red-400/50",
    success: "bg-emerald-500/95 border-emerald-400/50",
    info: "bg-slate-700/95 border-slate-600/50",
  }[toast.type];

  const iconPath = {
    error: "M6 18L18 6M6 6l12 12", // X
    success: "M5 13l4 4L19 7", // Check
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", // Info
  }[toast.type];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg text-white text-sm font-medium animate-slide-up ${bgClass}`}
      role="alert"
    >
      <svg
        className="w-5 h-5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
      </svg>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-1 hover:bg-white/20 rounded transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

const MAX_TOASTS = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    // Limit concurrent toasts to prevent screen overflow
    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, message, type }]);
  }, []);

  const toast = useCallback((message: string, type?: ToastType) => {
    addToast(message, type);
  }, [addToast]);

  const toastError = useCallback((message: string) => {
    addToast(message, "error");
  }, [addToast]);

  const toastSuccess = useCallback((message: string) => {
    addToast(message, "success");
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast, toastError, toastSuccess }}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm"
            aria-live="polite"
            aria-atomic="false"
          >
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} removeToast={removeToast} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
