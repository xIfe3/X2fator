"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileTabBar } from "./MobileTabBar";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./BrandLogo";

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
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fade-up overflow-y-auto bg-base-raised p-4">
            <div className="mb-4 flex items-center justify-between">
              <BrandLogo href="/dashboard" compact />
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 hover:bg-base-surface2"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-0.5 pb-6">
              {mobileNav.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm font-medium",
                    pathname === href
                      ? "bg-mint-soft text-mint"
                      : "text-ink-dim hover:bg-base-surface2 hover:text-ink",
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
        <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          <div className="mx-auto max-w-6xl animate-fade-up">{children}</div>
        </main>
      </div>

      <MobileTabBar onMore={() => setOpen(true)} />
    </div>
  );
}
