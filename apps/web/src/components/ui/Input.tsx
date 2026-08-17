import { InputHTMLAttributes, forwardRef, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FieldWrapProps {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldWrapProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    return (
      <label className="block">
        {label && <span className="mb-1.5 block text-xs font-medium text-ink-dim">{label}</span>}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-xl border border-base-border bg-base-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint",
            "focus:border-mint/60 focus:outline-none focus:ring-1 focus:ring-mint/40",
            error && "border-danger/60 focus:border-danger focus:ring-danger/30",
            className,
          )}
          {...props}
        />
        {hint && !error && <span className="mt-1.5 block text-xs text-ink-faint">{hint}</span>}
        {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
      </label>
    );
  },
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldWrapProps
>(({ className, label, error, ...props }, ref) => {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-ink-dim">{label}</span>}
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-base-border bg-base-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint",
          "focus:border-mint/60 focus:outline-none focus:ring-1 focus:ring-mint/40",
          error && "border-danger/60",
          className,
        )}
        {...props}
      />
      {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
    </label>
  );
});
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & FieldWrapProps
>(({ className, label, error, children, ...props }, ref) => {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-ink-dim">{label}</span>}
      <select
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-base-border bg-base-raised px-3.5 py-2.5 text-sm text-ink",
          "focus:border-mint/60 focus:outline-none focus:ring-1 focus:ring-mint/40",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
    </label>
  );
});
Select.displayName = "Select";
