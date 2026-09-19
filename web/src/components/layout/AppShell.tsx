"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy, Megaphone, X } from "lucide-react";
import { Topbar } from "./Topbar";
import { MobileTabBar } from "./MobileTabBar";
import { TelegramJoinPrompt } from "./TelegramJoinPrompt";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./BrandLogo";

const mobileNav = [
  ["/dashboard", "Dashboard"],
  ["/plans", "Plans"],
  ["/wallet", "Wallet"],
  ["/deposits", "Deposits"],
  ["/withdrawals", "Withdrawals"],
  ["/tasks", "Tasks"],
  ["/bonuses", "Daily streak"],
  ["/earnings", "Earnings"],
  ["/referrals", "Referrals"],
  ["/utilities", "Utilities"],
  ["/notifications", "Notifications"],
  ["/support", "Support"],
  ["/profile", "Profile"],
  ["/ads", "Promote"],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="app-page-background app-shell-frame h-dvh overflow-hidden">
      {open && (
        <div className="fixed inset-0 z-50">
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
                      ? "bg-primary-soft text-primary"
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

      <div className="flex h-dvh min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-28 sm:px-6 sm:py-6 sm:pb-28">
          <div className="mx-auto max-w-3xl animate-fade-up">
            {children}
          </div>
        </main>
      </div>

      <Link
        href="/support"
        aria-label="Open support"
        className="fixed bottom-24 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full brand-gradient text-white shadow-[0_10px_24px_-8px_rgba(37,99,235,0.8)] transition-transform hover:-translate-y-0.5 sm:right-8"
      >
        <LifeBuoy className="h-5 w-5" />
      </Link>
      <Link
        href="/ads"
        aria-label="Place an ad"
        className="fixed bottom-24 right-20 z-30 flex h-12 w-12 items-center justify-center rounded-full brand-gradient text-white shadow-[0_10px_24px_-8px_rgba(37,99,235,0.8)] transition-transform hover:-translate-y-0.5 sm:right-24"
      >
        <Megaphone className="h-5 w-5" />
      </Link>
      <MobileTabBar onMore={() => setOpen(true)} />
      <TelegramJoinPrompt />
    </div>
  );
}
