import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./BrandLogo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  progress,
  width = "sm",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  /** 0–100. Renders a slim "form completion" rule under the accent bar. Omit to hide it. */
  progress?: number;
  width?: "sm" | "md";
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base px-5 py-10">
      <div className="mb-8">
        <BrandLogo />
      </div>

      <div className={cn("w-full", width === "md" ? "max-w-md" : "max-w-sm")}>
        <div className="ticket-notch ticket-notch--raised overflow-hidden rounded-2xl border border-base-border bg-base-surface">
          {typeof progress === "number" && (
            <div className="h-0.5 w-full bg-base-border">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
          <div className="p-6 sm:p-8">
            <h1 className="font-display text-2xl font-semibold text-ink">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-ink-dim">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm text-ink-dim">{footer}</div>
        )}
      </div>
    </div>
  );
}
