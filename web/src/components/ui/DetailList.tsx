import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DetailRow {
  label: string;
  value: ReactNode;
  capitalize?: boolean;
}

/**
 * Renders a label/value list for a BottomSheet detail view — shared by
 * every "tap a row, see the details" sheet (wallet activity, deposits,
 * withdrawals, referrals). Rows with a nullish/empty `value` are
 * skipped so callers can pass conditional entries inline without an
 * extra filter step.
 */
export function DetailList({ rows }: { rows: DetailRow[] }) {
  const visible = rows.filter(
    (row) => row.value !== undefined && row.value !== null && row.value !== "",
  );

  return (
    <div className="divide-y divide-base-border">
      {visible.map((row) => (
        <div
          key={row.label}
          className="flex items-start justify-between gap-4 py-2.5 text-sm"
        >
          <span className="text-ink-faint">{row.label}</span>
          <span
            className={cn(
              "text-right font-medium text-ink",
              row.capitalize !== false && "capitalize",
            )}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
