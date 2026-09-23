import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  sub,
  iconClassName,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: "primary" | "secondary" | "neutral";
  sub?: string;
  iconClassName?: string;
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "secondary"
        ? "text-secondary"
        : "text-ink";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-base-border bg-base-surface p-5 shadow-[0_8px_24px_-18px_rgba(44,82,151,0.55)]">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-faint">
          {label}
        </span>
        {Icon && (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg bg-base-surface2",
              toneClass,
            )}
          >
            <Icon className={cn("h-4 w-4", iconClassName)} />
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-4 font-display text-2xl font-semibold tabular",
          toneClass,
        )}
      >
        {value}
      </p>
      {sub && (
        <>
          <div className="ticket-tear -mx-5 mt-4" />
          <p className="mt-2.5 px-0 text-xs text-ink-dim">{sub}</p>
        </>
      )}
    </div>
  );
}
