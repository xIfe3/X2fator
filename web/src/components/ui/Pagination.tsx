import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-between gap-3 pt-2", className)}>
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-dim transition-colors hover:bg-base-surface2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Prev
      </button>
      <span className="text-xs text-ink-faint">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-dim transition-colors hover:bg-base-surface2 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
      >
        Next <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
