"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchSelectOption {
  value: string;
  label: string;
}

interface SearchSelectProps {
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export function SearchSelect({
  label,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  options,
  value,
  onChange,
  disabled,
  required,
  error,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-ink-dim">
          {label}
        </span>
      )}
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-xl border border-base-border bg-base-raised px-3.5 py-2.5 text-left text-sm text-ink",
            "focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40",
            disabled && "cursor-not-allowed opacity-60",
            error && "border-danger/60",
          )}
        >
          <span className={cn("truncate", !selected && "text-ink-faint")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint" />
        </button>

        {required && (
          <input
            tabIndex={-1}
            aria-hidden
            className="absolute h-0 w-0 opacity-0"
            value={value}
            required
            onChange={() => {}}
          />
        )}

        {open && (
          <div className="absolute z-50 mt-1.5 w-full animate-fade-up rounded-xl border border-base-border bg-base-surface shadow-panel">
            <div className="flex items-center gap-2 border-b border-base-border px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-ink-faint" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-ink-faint">
                  No matches.
                </p>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-dim transition-colors hover:bg-base-surface2 hover:text-ink"
                  >
                    <span className="truncate">{option.label}</span>
                    {option.value === value && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && (
        <span className="mt-1.5 block text-xs text-danger">{error}</span>
      )}
    </label>
  );
}
