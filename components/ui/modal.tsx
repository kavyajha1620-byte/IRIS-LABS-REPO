"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
        <div
          className={cn(
            "relative w-full rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-border",
            sizes[size]
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border p-5 pb-4">
            <div>
              <h2 className="text-base font-semibold">{title}</h2>
              {description && (
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-border p-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}