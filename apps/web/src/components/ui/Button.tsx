"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "auth"
  | "secondary"
  | "ghost"
  | "danger"
  | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "brand-gradient text-white font-semibold shadow-[0_9px_18px_-10px_rgba(37,99,235,0.8)] hover:brightness-105 disabled:opacity-50 disabled:shadow-none",
  auth: "bg-primary text-white font-semibold shadow-[0_7px_16px_-10px_rgba(37,99,235,0.65)] hover:bg-primary-dim disabled:bg-primary/50 disabled:shadow-none",
  secondary:
    "bg-primary-soft text-primary hover:bg-base-borderStrong border border-primary/10",
  outline:
    "border border-base-border text-ink hover:border-base-borderStrong hover:bg-base-surface2",
  ghost: "text-ink-dim hover:text-ink hover:bg-base-surface2",
  danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-danger/40",
};

const sizes: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2.5 gap-2",
  lg: "text-base px-5 py-3 gap-2",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {isLoading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
