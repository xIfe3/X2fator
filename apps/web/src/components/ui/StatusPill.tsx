import { cn, statusTone } from "@/lib/utils";

const toneClasses: Record<string, string> = {
  primary: "bg-primary-soft text-primary border-primary-dim/40",
  secondary: "bg-secondary-soft text-secondary border-secondary-dim/40",
  danger: "bg-danger-soft text-danger border-danger/30",
  info: "bg-info-soft text-info border-info/30",
  neutral: "bg-base-surface2 text-ink-dim border-base-border",
};

export function StatusPill({ status }: { status: string | null | undefined }) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
        toneClasses[tone],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {(status ?? "unknown").replace(/_/g, " ")}
    </span>
  );
}
