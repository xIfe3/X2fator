import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
}) {
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-base-surface2",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );

  if (!label) return button;

  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-faint">{hint}</span>}
      </span>
      {button}
    </label>
  );
}
