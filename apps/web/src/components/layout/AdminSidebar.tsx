"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  LayoutDashboard,
  ArrowDownToLine,
  Megaphone,
  ScrollText,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./BrandLogo";

export const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: Wallet },
  { href: "/admin/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/admin/ads", label: "Ad campaigns", icon: Megaphone },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-base-border bg-base-raised lg:flex">
      <div className="px-6 py-6">
        <BrandLogo href="/admin" compact admin />
        <p className="ml-10 mt-1 text-[11px] font-medium text-secondary">
          Admin console
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {adminNav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary-soft text-secondary"
                  : "text-ink-dim hover:bg-base-surface2 hover:text-ink",
              )}
            >
              {active && (
                <span className="absolute -left-3 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-secondary" />
              )}
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-ink-dim hover:bg-base-surface2 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to app
        </Link>
      </div>
    </aside>
  );
}
