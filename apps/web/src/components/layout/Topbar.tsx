"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { walletApi } from "@/lib/api/wallet";
import { notificationsApi } from "@/lib/api/notifications";
import { formatMoney, initials } from "@/lib/utils";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const [balance, setBalance] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  function refreshBalance() {
    walletApi
      .getBalance()
      .then((b) => setBalance(String(b.total)))
      .catch(() => setBalance(null));
  }

  useEffect(() => {
    refreshBalance();
    notificationsApi
      .unreadCount()
      .then((r) => setUnread(r.count))
      .catch(() => setUnread(0));

    window.addEventListener("wallet-updated", refreshBalance);
    return () => window.removeEventListener("wallet-updated", refreshBalance);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-base-border bg-base px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-ink-dim hover:bg-base-surface2 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/wallet"
          className="hidden items-center gap-2 rounded-full border border-base-border bg-base-surface px-3.5 py-1.5 sm:flex"
        >
          <Wallet className="h-3.5 w-3.5 text-mint" />
          <span className="font-mono text-xs font-semibold tabular text-ink">
            {balance !== null ? formatMoney(balance) : "···"}
          </span>
        </Link>

        <Link
          href="/notifications"
          className="relative rounded-lg p-2 text-ink-dim hover:bg-base-surface2 hover:text-ink"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-amber ring-2 ring-base" />
          )}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-base-surface2"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-base-surface2 text-xs font-semibold text-ink">
              {user ? initials(user.firstName, user.lastName) : "··"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-ink-faint" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-50 w-52 animate-fade-up rounded-xl border border-base-border bg-base-surface p-1.5 shadow-panel">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium text-ink">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-xs text-ink-faint">{user?.email}</p>
              </div>
              <div className="my-1 h-px bg-base-border" />
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-dim hover:bg-base-surface2 hover:text-ink"
                onClick={() => setMenuOpen(false)}
              >
                <UserIcon className="h-4 w-4" /> Profile
              </Link>
              <Link
                href="/kyc"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-dim hover:bg-base-surface2 hover:text-ink"
                onClick={() => setMenuOpen(false)}
              >
                <Settings className="h-4 w-4" /> KYC status
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
