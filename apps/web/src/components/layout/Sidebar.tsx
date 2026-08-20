"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  LineChart,
  ListChecks,
  Coins,
  Users,
  ShieldCheck,
  Bell,
  LifeBuoy,
  Zap,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { BrandLogo } from "./BrandLogo";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/deposits", label: "Deposits", icon: ArrowDownToLine },
  { href: "/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
  { href: "/plans", label: "Plans", icon: LineChart },
  { href: "/subscriptions", label: "Subscriptions", icon: ListChecks },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/earnings", label: "Earnings", icon: Coins },
  { href: "/referrals", label: "Referrals", icon: Users },
  { href: "/kyc", label: "KYC", icon: ShieldCheck },
  { href: "/utilities", label: "Utilities", icon: Zap },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-base-border bg-base-raised lg:flex">
      <div className="px-6 py-6">
        <BrandLogo href="/dashboard" compact />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-mint-soft text-mint"
                  : "text-ink-dim hover:bg-base-surface2 hover:text-ink",
              )}
            >
              {active && (
                <span className="absolute -left-3 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-mint" />
              )}
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="mt-4 px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
              Admin
            </div>
            <Link
              href="/admin"
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-amber-soft text-amber"
                  : "text-ink-dim hover:bg-base-surface2 hover:text-ink",
              )}
            >
              {pathname.startsWith("/admin") && (
                <span className="absolute -left-3 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-amber" />
              )}
              <ShieldAlert className="h-4 w-4" />
              Admin console
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
