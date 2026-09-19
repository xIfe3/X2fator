"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Bell,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  ArrowDownToLine,
  CalendarCheck,
  CreditCard,
  LifeBuoy,
  Megaphone,
  ScrollText,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { ADMIN_ROUTE_PERMISSIONS } from "@/lib/admin-permissions";
import { BrandLogo } from "./BrandLogo";

export const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: Wallet },
  { href: "/admin/wallets", label: "Wallet ledger", icon: BookOpen },
  { href: "/admin/payments", label: "Payment gateway", icon: CreditCard },
  { href: "/admin/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/admin/checkin", label: "Daily check-in", icon: CalendarCheck },
  { href: "/admin/plans", label: "Plans", icon: Award },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: TrendingUp },
  { href: "/admin/ads", label: "Ad campaigns", icon: Megaphone },
  { href: "/admin/referrals", label: "Referrals", icon: Users },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/site-content", label: "Site settings", icon: Settings },
  { href: "/admin/roles", label: "Roles & staff", icon: ShieldCheck },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  // Only show nav entries the signed-in staff member actually has
  // access to — a route with no entry in ADMIN_ROUTE_PERMISSIONS (like
  // the Overview page) is visible to any staff member.
  const visibleNav = adminNav.filter((item) => {
    const required = ADMIN_ROUTE_PERMISSIONS[item.href];
    return !required || hasPermission(required);
  });

  return (
    <aside className="hidden h-dvh w-60 shrink-0 flex-col border-r border-base-border bg-base-raised lg:flex">
      <div className="shrink-0 px-6 py-6">
        <BrandLogo href="/admin" compact admin />
        <p className="ml-10 mt-1 text-[11px] font-medium text-secondary">
          Admin console
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {visibleNav.map((item) => {
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

      <div className="shrink-0 border-t border-base-border p-3">
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
