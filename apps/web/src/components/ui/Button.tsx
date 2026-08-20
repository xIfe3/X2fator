"use client";

import { createElement, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-mint text-base font-semibold shadow-stamp hover:bg-mint-dim disabled:bg-mint/40 disabled:shadow-none",
  secondary:
    "bg-base-surface2 text-ink hover:bg-base-borderStrong border border-base-border",
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
  return createElement(
    "button",
    {
      ...props,
      type: props.type ?? "button",
      disabled: disabled || isLoading,
      className: cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      ),
    },
    isLoading ? createElement(Loader2, { className: "h-4 w-4 animate-spin" }) : null,
    children,
  );
}
