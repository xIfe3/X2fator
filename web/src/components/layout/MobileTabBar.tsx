"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ListChecks,
  UserRound,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export function MobileTabBar({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)" }}
    >
      <div className="tabbar-glass flex w-full max-w-sm items-stretch gap-0.5 rounded-full px-2 py-2 shadow-[0_16px_40px_-16px_rgba(15,23,42,0.55)]">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-ink-faint hover:text-ink-dim",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  active && "drop-shadow-[0_0_10px_rgba(231,182,74,0.35)]",
                )}
              />
              {tab.label}
            </Link>
          );
        })}
        <button
          onClick={onMore}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-medium text-ink-faint transition-colors hover:text-ink-dim"
        >
          <Menu className="h-5 w-5" />
          More
        </button>
      </div>
    </nav>
  );
}
