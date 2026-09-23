"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  // Mounted stays true through the closing animation so the sheet can
  // slide back down instead of just vanishing.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <div
        className={cn(
          "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        onTransitionEnd={() => {
          if (!open) setMounted(false);
        }}
        className={cn(
          "relative w-full max-w-md rounded-t-3xl border border-base-border bg-base-surface p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-panel transition-transform duration-300 ease-out sm:rounded-2xl sm:pb-6",
          open ? "translate-y-0" : "translate-y-full sm:translate-y-6",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-base-border sm:hidden" />
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">
              {title}
            </h2>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
