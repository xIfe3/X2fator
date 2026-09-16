"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AdminSidebar, adminNav } from "@/components/layout/AdminSidebar";
import { AdminMobileTabBar } from "@/components/layout/AdminMobileTabBar";
import { Topbar } from "@/components/layout/Topbar";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/layout/BrandLogo";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login");
    else if (!isAdmin) router.replace("/dashboard");
  }, [isLoading, user, isAdmin, router]);

  if (isLoading || !user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="app-shell-frame h-dvh overflow-hidden bg-base">
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fade-up overflow-y-auto bg-base-raised p-4">
            <div className="mb-4 flex items-center justify-between">
              <BrandLogo href="/admin" compact admin />
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 hover:bg-base-surface2"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-0.5 pb-6">
              {adminNav.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-secondary-soft text-secondary"
                        : "text-ink-dim hover:bg-base-surface2 hover:text-ink",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="mt-2 flex items-center gap-3 rounded-lg border-t border-base-border px-3 pt-4 text-sm font-medium text-ink-dim hover:text-ink"
              >
                Back to app
              </Link>
            </nav>
          </div>
        </div>
      )}

      <div className="flex h-dvh">
        <AdminSidebar />

        <div className="flex h-dvh min-w-0 flex-1 flex-col">
          <Topbar homeHref="/admin" wide />
          <main className="flex-1 overflow-y-auto px-4 py-4 pb-28 sm:px-6 sm:py-6 sm:pb-10 lg:pb-10">
            <div className="mx-auto max-w-[1200px] animate-fade-up">
              {children}
            </div>
          </main>
        </div>
      </div>

      <AdminMobileTabBar onMore={() => setOpen(true)} />
    </div>
  );
}
