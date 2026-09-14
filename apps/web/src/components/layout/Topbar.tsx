"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { walletApi } from "@/lib/api/wallet";
import { notificationsApi } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./BrandLogo";
import { Avatar } from "../ui/Avatar";
import { Money } from "../ui/Money";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "../ui/Menu";

export function Topbar({
  homeHref = "/dashboard",
  wide = false,
}: {
  homeHref?: string;
  wide?: boolean;
}) {
  const { user, logout } = useAuth();
  const [balance, setBalance] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

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

  return (
    <header className="sticky top-0 z-30 h-[68px] shrink-0 border-b border-base-border bg-base-surface/95 shadow-[0_2px_14px_-12px_rgba(31,67,135,0.35)] backdrop-blur">
      <div
        className={cn(
          "mx-auto flex h-full w-full items-center justify-between px-5",
          wide ? "max-w-[1200px] lg:justify-end" : "max-w-3xl",
        )}
      >
        <span className={wide ? "lg:hidden" : undefined}>
          <BrandLogo href={homeHref} compact />
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/wallet"
            className="hidden items-center gap-2 rounded-full border border-base-border bg-base-surface px-3.5 py-1.5 sm:flex"
          >
            <Wallet className="h-3.5 w-3.5 text-primary" />
            {balance !== null ? (
              <Money value={balance} size="sm" />
            ) : (
              <span className="font-mono text-xs font-semibold tabular text-ink">
                ···
              </span>
            )}
          </Link>

          <Link
            href="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-base-border text-ink-dim hover:bg-base-surface2 hover:text-ink"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-secondary ring-2 ring-base" />
            )}
          </Link>

          <Menu>
            <MenuTrigger>
              {(props) => (
                <button
                  {...props}
                  className="flex items-center gap-2 rounded-full border border-base-border py-1 pl-1 pr-2 hover:bg-base-surface2"
                >
                  <Avatar
                    size="sm"
                    firstName={user?.firstName}
                    lastName={user?.lastName}
                  />
                  <ChevronDown className="h-3.5 w-3.5 text-ink-faint" />
                </button>
              )}
            </MenuTrigger>
            <MenuContent align="end">
              <MenuLabel>
                <p className="truncate text-sm font-medium text-ink">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-xs text-ink-faint">{user?.email}</p>
              </MenuLabel>
              <MenuSeparator />
              <MenuItem icon={UserIcon} href="/profile">
                Profile
              </MenuItem>
              <MenuItem icon={Settings} href="/settings">
                Settings
              </MenuItem>
              <MenuItem icon={LogOut} variant="danger" onSelect={logout}>
                Log out
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>
    </header>
  );
}
