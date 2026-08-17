import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "mint",
  sub,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: "mint" | "amber" | "neutral";
  sub?: string;
}) {
  const toneClass = tone === "mint" ? "text-mint" : tone === "amber" ? "text-amber" : "text-ink";
  return (
    <div className="ledger-surface relative overflow-hidden rounded-2xl border border-base-border bg-base-surface p-5">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-faint">{label}</span>
        {Icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-base-surface2", toneClass)}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={cn("mt-4 font-mono text-2xl font-semibold tabular", toneClass)}>{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-dim">{sub}</p>}
    </div>
  );
}
