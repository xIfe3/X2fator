import type { HTMLAttributes } from "react";
import { cn, type Tone } from "@/lib/utils";

type Variant = "solid" | "outline" | "stamp";

const toneClasses: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary border-primary-dim/40",
  secondary: "bg-secondary-soft text-secondary border-secondary-dim/40",
  danger: "bg-danger-soft text-danger border-danger/30",
  info: "bg-info-soft text-info border-info/30",
  neutral: "bg-base-surface2 text-ink-dim border-base-border",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  variant?: Variant;
}

export function Badge({
  tone = "neutral",
  variant = "solid",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        toneClasses[tone],
        variant === "outline" && "bg-transparent",
        variant === "stamp" &&
          "-rotate-6 rounded-lg border-[1.5px] border-current bg-transparent px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.08em]",
        className,
      )}
    >
      {children}
    </span>
  );
}
