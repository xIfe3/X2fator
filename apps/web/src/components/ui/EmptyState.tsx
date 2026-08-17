import { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-base-border py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-base-surface2 text-ink-faint">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="mt-1 max-w-xs text-xs text-ink-dim">{description}</p>}
      </div>
      {action}
    </div>
  );
}
