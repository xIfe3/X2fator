import { ReactNode } from "react";
import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Signature panel: the "2x" ledger mark anchors the brand */}
      <div className="ledger-surface relative hidden overflow-hidden border-r border-base-border bg-base-raised lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mint font-display text-base font-bold text-base">
            2X
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">2xFactor</span>
        </Link>

        <div className="space-y-6">
          <p className="max-w-sm font-display text-3xl font-medium leading-tight text-ink">
            Every deposit, task, and referral — <span className="text-mint">one ledger</span>, always reconciled.
          </p>
          <div className="flex gap-8 font-mono text-sm text-ink-dim">
            <div>
              <div className="text-2xl font-semibold text-amber">2×</div>
              <div className="mt-1 text-xs uppercase tracking-wider">multiplier plans</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-mint">24/7</div>
              <div className="mt-1 text-xs uppercase tracking-wider">wallet access</div>
            </div>
          </div>
        </div>

        <p className="text-xs text-ink-faint">Sandbox learning environment — not a real financial product.</p>
      </div>

      <div className="flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint font-display text-sm font-bold text-base">
                2X
              </span>
              <span className="font-display text-base font-semibold">2xFactor</span>
            </Link>
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-dim">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-sm text-ink-dim">{footer}</div>
        </div>
      </div>
    </div>
  );
}
