"use client";

import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-full border border-base-border bg-base-raised p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
            active === tab.key
              ? "bg-primary text-white shadow-sm"
              : "text-ink-dim hover:text-ink",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
