"use client";

import { useState, type ReactNode } from "react";
import {
  Ban,
  Check,
  Copy,
  PauseCircle,
  Pencil,
  PlayCircle,
  Wallet as WalletIcon,
  WalletCards,
} from "lucide-react";
import type { AdminUser, AdminUserDetail } from "@/lib/types";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DetailList } from "@/components/ui/DetailList";
import { Money } from "@/components/ui/Money";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { cn, formatDate, formatDateTime, formatMoney } from "@/lib/utils";

export type UserAction = "suspend" | "activate" | "block";

type Section = "overview" | "plans" | "referrals";

interface UserDetailPanelProps {
  open: boolean;
  onClose: () => void;
  user: AdminUserDetail | null;
  isLoading: boolean;
  permissions: {
    canUpdate: boolean;
    canSuspend: boolean;
    canActivate: boolean;
    canBlock: boolean;
    canAdjustWallet: boolean;
  };
  onEdit: (user: AdminUser) => void;
  onAdjustWallet: (user: AdminUser) => void;
  onViewWallet: (user: AdminUser) => void;
  onAction: (user: AdminUser, action: UserAction) => void;
  onOpenUser: (id: string) => void;
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          ?.writeText(value)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          })
          .catch(() => {});
      }}
      className="inline-flex items-center gap-1.5 hover:text-primary"
      title="Copy"
    >
      {value}
      {copied ? (
        <Check className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-ink-faint" />
      )}
    </button>
  );
}

function YesNo({ value }: { value: boolean | undefined }) {
  return (
    <Badge tone={value ? "primary" : "neutral"}>{value ? "Yes" : "No"}</Badge>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
      {children}
    </h3>
  );
}

export function UserDetailPanel({
  open,
  onClose,
  user,
  isLoading,
  permissions,
  onEdit,
  onAdjustWallet,
  onViewWallet,
  onAction,
  onOpenUser,
}: UserDetailPanelProps) {
  const [section, setSection] = useState<Section>("overview");

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setSection("overview");
        onClose();
      }}
      className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"
    >
      {isLoading || !user ? (
        <PageSkeleton />
      ) : (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start gap-3.5">
            <Avatar
              firstName={user.firstName}
              lastName={user.lastName}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate font-display text-lg font-semibold text-ink">
                  {user.firstName} {user.lastName}
                </h2>
                <StatusPill status={user.status} />
                {user.roles
                  ?.filter((r) => r !== "user")
                  .map((role) => (
                    <Badge key={role} tone="info" className="capitalize">
                      {role.replace(/_/g, " ")}
                    </Badge>
                  ))}
              </div>
              <p className="mt-0.5 text-sm text-primary">@{user.username}</p>
              <p className="truncate text-xs text-ink-faint">{user.email}</p>
            </div>
          </div>

          {/* Balances */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-base-border bg-base-raised p-3">
              <p className="text-[11px] uppercase tracking-wider text-ink-faint">
                Total
              </p>
              <Money value={user.totalBalance} className="mt-1 block font-semibold" />
            </div>
            {(["account", "task", "referral"] as const).map((type) => (
              <div
                key={type}
                className="rounded-xl border border-base-border bg-base-raised p-3"
              >
                <p className="text-[11px] uppercase tracking-wider text-ink-faint">
                  {type}
                </p>
                <Money
                  value={user.wallets[type]?.balance ?? "0"}
                  className="mt-1 block font-semibold"
                />
                {user.wallets[type]?.status === "frozen" && (
                  <p className="text-[10px] text-danger">Frozen</p>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {permissions.canUpdate && (
              <Button size="sm" variant="secondary" onClick={() => onEdit(user)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => onViewWallet(user)}>
              <WalletCards className="h-3.5 w-3.5" /> Transactions
            </Button>
            {permissions.canAdjustWallet && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAdjustWallet(user)}
              >
                <WalletIcon className="h-3.5 w-3.5" /> Adjust wallet
              </Button>
            )}
            {permissions.canActivate && user.status !== "active" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onAction(user, "activate")}
              >
                <PlayCircle className="h-3.5 w-3.5" /> Activate
              </Button>
            )}
            {permissions.canSuspend && user.status === "active" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(user, "suspend")}
              >
                <PauseCircle className="h-3.5 w-3.5" /> Suspend
              </Button>
            )}
            {permissions.canBlock && user.status !== "blocked" && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => onAction(user, "block")}
              >
                <Ban className="h-3.5 w-3.5" /> Block
              </Button>
            )}
          </div>

          {/* Section switcher */}
          <div className="flex gap-1 border-b border-base-border">
            {(
              [
                { key: "overview", label: "Overview" },
                {
                  key: "plans",
                  label: `Plans (${user.subscriptions.length})`,
                },
                {
                  key: "referrals",
                  label: `Referrals (${user.referralCount ?? 0})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSection(tab.key)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                  section === tab.key
                    ? "border-primary text-ink"
                    : "border-transparent text-ink-faint hover:text-ink",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {section === "overview" && (
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <div>
                <SectionTitle>Account</SectionTitle>
                <DetailList
                  rows={[
                    {
                      label: "Username",
                      value: <CopyValue value={user.username} />,
                      capitalize: false,
                    },
                    {
                      label: "Referral code",
                      value: <CopyValue value={user.referralCode} />,
                      capitalize: false,
                    },
                    { label: "Email", value: user.email, capitalize: false },
                    { label: "Phone", value: user.phone ?? "—", capitalize: false },
                    { label: "Gender", value: user.gender ?? "—" },
                    {
                      label: "Roles",
                      value: user.roles?.length
                        ? user.roles.join(", ").replace(/_/g, " ")
                        : "—",
                    },
                    {
                      label: "Current plan",
                      value: user.activePlan ?? "None",
                    },
                  ]}
                />
              </div>
              <div>
                <SectionTitle>Security & activity</SectionTitle>
                <DetailList
                  rows={[
                    { label: "Email verified", value: <YesNo value={user.emailVerified} /> },
                    { label: "Phone verified", value: <YesNo value={user.phoneVerified} /> },
                    {
                      label: "Withdrawal PIN set",
                      value: <YesNo value={user.hasWithdrawalPin} />,
                    },
                    { label: "Login count", value: user.loginCount ?? 0 },
                    {
                      label: "Last login",
                      value: user.lastLoginAt
                        ? formatDateTime(user.lastLoginAt)
                        : "Never",
                    },
                    {
                      label: "Check-in streak",
                      value: `${user.currentStreak ?? 0} (best ${user.longestStreak ?? 0})`,
                    },
                    {
                      label: "Joined Telegram",
                      value: user.telegramJoinedAt
                        ? formatDate(user.telegramJoinedAt)
                        : "No",
                    },
                    {
                      label: "Joined",
                      value: user.createdAt
                        ? formatDateTime(user.createdAt)
                        : "—",
                    },
                  ]}
                />
              </div>
            </div>
          )}

          {section === "plans" &&
            (user.subscriptions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-base-border p-6 text-center text-sm text-ink-faint">
                This user has never bought a plan.
              </p>
            ) : (
              <div className="divide-y divide-base-border rounded-xl border border-base-border">
                {user.subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-4 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {sub.planName}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {sub.dailyTaskLimit} tasks/day ·{" "}
                        {formatMoney(sub.dailyReward)}/day · started{" "}
                        {formatDate(sub.startsAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Money value={sub.amountPaid} size="sm" />
                      <StatusPill status={sub.status} />
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {section === "referrals" && (
            <div className="space-y-3">
              <DetailList
                rows={[
                  {
                    label: "Referred by",
                    value: user.referredBy ? (
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => onOpenUser(user.referredBy!.id)}
                      >
                        {user.referredBy.firstName} {user.referredBy.lastName}{" "}
                        (@{user.referredBy.username})
                      </button>
                    ) : (
                      "Nobody"
                    ),
                    capitalize: false,
                  },
                  {
                    label: "People referred",
                    value: user.referralCount ?? 0,
                  },
                ]}
              />
              {user.recentReferrals.length > 0 && (
                <div>
                  <SectionTitle>Most recent</SectionTitle>
                  <div className="divide-y divide-base-border rounded-xl border border-base-border">
                    {user.recentReferrals.map((ref) => (
                      <button
                        key={ref.id}
                        type="button"
                        onClick={() => onOpenUser(ref.id)}
                        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-base-surface2/60"
                      >
                        <Avatar
                          firstName={ref.firstName}
                          lastName={ref.lastName}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">
                            {ref.firstName} {ref.lastName}
                          </p>
                          <p className="text-xs text-ink-faint">
                            @{ref.username} · {formatDate(ref.createdAt)}
                          </p>
                        </div>
                        <StatusPill status={ref.status} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
