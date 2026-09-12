import type { HTMLAttributes } from "react";
import { cn, formatMoney, type Tone } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-2xl",
  xl: "text-3xl sm:text-4xl",
};

const toneClasses: Partial<Record<Tone, string>> = {
  primary: "text-primary",
  secondary: "text-secondary",
  danger: "text-danger",
  info: "text-info",
};

interface MoneyProps extends HTMLAttributes<HTMLSpanElement> {
  value: string | number | null | undefined;
  size?: Size;
  tone?: Tone;
  /** Prefixes "+" for positive/credit amounts, "−" for debits. */
  signed?: "credit" | "debit";
}

export function Money({
  value,
  size = "md",
  tone,
  signed,
  className,
  ...props
}: MoneyProps) {
  const formatted = formatMoney(value);
  const prefix = signed === "credit" ? "+" : signed === "debit" ? "−" : "";

  return (
    <span
      {...props}
      className={cn(
        "font-mono font-semibold tabular",
        sizeClasses[size],
        tone && toneClasses[tone],
        className,
      )}
    >
      {prefix}
      {formatted}
    </span>
  );
}
