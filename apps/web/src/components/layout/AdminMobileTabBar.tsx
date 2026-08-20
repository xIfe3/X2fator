"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, ShieldCheck, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/kyc", label: "KYC", icon: ShieldCheck },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: Wallet },
] as const;

export function AdminMobileTabBar({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-base-border bg-base-raised/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-center text-[10px] font-medium leading-tight transition-colors",
              active ? "text-amber" : "text-ink-faint",
            )}
          >
            <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_10px_rgba(55,194,168,0.35)]")} />
            {item.label}
          </Link>
        );
      })}
      <button
        onClick={onMore}
        className="flex flex-1 flex-col items-center gap-1 py-2.5 text-center text-[10px] font-medium leading-tight text-ink-faint transition-colors"
      >
        <Menu className="h-5 w-5" />
        More
      </button>
    </nav>
  );
}
