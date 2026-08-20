"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, ListChecks, Coins, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/earnings", label: "Earnings", icon: Coins },
] as const;

export function MobileTabBar({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-base-border bg-base-raised/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              active ? "text-mint" : "text-ink-faint",
            )}
          >
            <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_10px_rgba(231,182,74,0.35)]")} />
            {tab.label}
          </Link>
        );
      })}
      <button
        onClick={onMore}
        className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-ink-faint transition-colors"
      >
        <Menu className="h-5 w-5" />
        More
      </button>
    </nav>
  );
}
