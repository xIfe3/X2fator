"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "@/lib/utils";

const mobileNav = [
  ["/dashboard", "Dashboard"],
  ["/wallet", "Wallet"],
  ["/deposits", "Deposits"],
  ["/withdrawals", "Withdrawals"],
  ["/plans", "Plans"],
  ["/subscriptions", "Subscriptions"],
  ["/tasks", "Tasks"],
  ["/earnings", "Earnings"],
  ["/referrals", "Referrals"],
  ["/kyc", "KYC"],
  ["/utilities", "Utilities"],
  ["/notifications", "Notifications"],
  ["/support", "Support"],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 animate-fade-up bg-base-raised p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint font-display text-sm font-bold text-base">
                  2X
                </span>
                <span className="font-display text-base font-semibold">2xFactor</span>
              </span>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-base-surface2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-0.5">
              {mobileNav.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm font-medium",
                    pathname === href ? "bg-mint-soft text-mint" : "text-ink-dim hover:bg-base-surface2 hover:text-ink",
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
