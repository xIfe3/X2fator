"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Award,
  Coins,
  Eye,
  EyeOff,
  Flame,
  ListChecks,
  Smartphone,
  Trophy,
  Users,
  Wallet,
  Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouteLoader } from "@/components/layout/RouteLoader";
import { useApiQuery } from "@/hooks/useApiQuery";
import { walletApi } from "@/lib/api/wallet";
import { referralsApi } from "@/lib/api/referrals";
import type { WalletTransaction } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Money } from "@/components/ui/Money";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DetailList } from "@/components/ui/DetailList";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";
import { bonusesApi } from "@/lib/api/bonuses";
import { Leaderboard } from "../referrals/Leaderboard";

const quickActions = [
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/deposits", label: "Deposit", icon: ArrowDownToLine },
  { href: "/withdrawals", label: "Withdraw", icon: ArrowUpFromLine },
  { href: "/plans", label: "Plans", icon: Award },
  { href: "/utilities?type=data", label: "Data", icon: Wifi },
  { href: "/utilities?type=airtime", label: "Airtime", icon: Smartphone },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { start: startRouteLoader } = useRouteLoader();
  const [hideBalance, setHideBalance] = useState(false);
  const [clickedHref, setClickedHref] = useState<string | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<WalletTransaction | null>(
    null,
  );

  function handleQuickAction(href: string) {
    setClickedHref(href);
    setTimeout(() => {
      startRouteLoader();
      router.push(href);
    }, 150);
  }
  const { data: balance, isLoading: balanceLoading } = useApiQuery(() =>
    walletApi.getBalance(),
  );
  const { data: txns, isLoading: txnsLoading } = useApiQuery(() =>
    walletApi.getTransactions("account"),
  );
  const { data: referral } = useApiQuery(() => referralsApi.me());
  const { data: leaderboard } = useApiQuery(() =>
    referralsApi.leaderboard("week"),
  );
  const { data: dailyBonus } = useApiQuery(() => bonusesApi.daily());

  const milestoneDays = dailyBonus?.milestoneDays ?? 30;
  const streakDay = dailyBonus?.claimed
    ? dailyBonus.currentStreak
    : (dailyBonus?.nextStreak ?? 0) - 1;
  const streakPct = Math.min(100, (Math.max(streakDay, 0) / milestoneDays) * 100);

  return (
    <div className="space-y-6">
      {/* Hero — full-bleed dark balance block, Cash App style */}
      <div className="relative overflow-hidden rounded-3xl bg-base-raised">
        <div
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-primary/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-secondary/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-dim">
              Hey {user?.firstName} 👋
            </p>
            <button
              type="button"
              onClick={() => setHideBalance((v) => !v)}
              aria-label={hideBalance ? "Show balance" : "Hide balance"}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-base-surface2 text-ink-faint transition-colors hover:text-ink"
            >
              {hideBalance ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {balanceLoading ? (
            <Skeleton className="mt-4 h-12 w-56" />
          ) : (
            <p className="mt-2 font-display text-5xl font-bold tracking-tight text-ink sm:text-6xl">
              {hideBalance ? "••••••" : formatMoney(balance?.total)}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/deposits"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-[0.97]"
            >
              <ArrowDownToLine className="h-4 w-4" /> Add money
            </Link>
            <Link
              href="/withdrawals"
              className="inline-flex items-center gap-1.5 rounded-full bg-base-surface2 px-4 py-2 text-sm font-semibold text-ink transition-transform active:scale-[0.97]"
            >
              <ArrowUpFromLine className="h-4 w-4" /> Withdraw
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 border-t border-base-border pt-5">
            <Link href="/wallet" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                <Coins className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-ink-faint">Task wallet</p>
                {hideBalance ? (
                  <p className="text-sm font-semibold text-ink">••••</p>
                ) : (
                  <Money value={balance?.task} size="sm" className="block" />
                )}
              </div>
            </Link>
            <Link href="/referrals" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Users className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-ink-faint">Referral wallet</p>
                {hideBalance ? (
                  <p className="text-sm font-semibold text-ink">••••</p>
                ) : (
                  <Money
                    value={balance?.referral}
                    size="sm"
                    className="block"
                  />
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick actions — 3x3 grid */}
      <div className="grid grid-cols-3 gap-3">
        {quickActions.map((a) => (
          <button
            key={a.href}
            type="button"
            onClick={() => handleQuickAction(a.href)}
            className="group flex flex-col items-center gap-2"
          >
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl text-ink transition-colors duration-150 group-active:scale-95",
                clickedHref === a.href
                  ? "bg-danger text-white"
                  : "bg-base-surface group-hover:bg-base-surface2",
              )}
            >
              <a.icon className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium text-ink-dim">
              {a.label}
            </span>
          </button>
        ))}
      </div>

      {/* Streak — dark accent block, not a bordered card */}
      <Link
        href="/bonuses"
        className="group relative block overflow-hidden rounded-2xl bg-secondary-soft p-5 transition-transform active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20 text-secondary">
            <Flame className="h-5 w-5" />
          </span>
          {!dailyBonus?.claimed && <Badge tone="secondary">Claim</Badge>}
        </div>
        <p className="mt-4 text-sm font-semibold text-ink">Daily streak</p>
        <p className="text-2xl font-bold text-secondary">
          Day {Math.max(streakDay, 0)}
          <span className="text-sm font-medium text-ink-faint">
            {" "}
            / {milestoneDays}
          </span>
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-base-surface2">
          <div
            className="h-full rounded-full bg-secondary transition-all"
            style={{ width: `${streakPct}%` }}
          />
        </div>
      </Link>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <Card className="sm:col-span-3">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <Link
              href="/wallet"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardBody>
            {txnsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : !txns || txns.items.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No transactions yet"
                description="Your deposits and withdrawals will show up here."
              />
            ) : (
              <div className="space-y-1">
                {txns.items.slice(0, 6).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTxn(t)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-base-surface2"
                  >
                    <span
                      className={
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
                        (t.direction === "credit"
                          ? "bg-secondary-soft text-secondary"
                          : "bg-danger-soft text-danger")
                      }
                    >
                      {t.direction === "credit" ? (
                        <ArrowDownToLine className="h-4 w-4" />
                      ) : (
                        <ArrowUpFromLine className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium capitalize text-ink">
                        {t.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-[11px] text-ink-faint">
                        {formatDateTime(t.createdAt)}
                      </p>
                    </div>
                    <Money
                      value={t.amount}
                      size="sm"
                      signed={t.direction}
                      tone={t.direction === "credit" ? "secondary" : "danger"}
                    />
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4 sm:col-span-2">
          <Card>
            <CardBody className="text-center">
              <p className="text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                Your referral code
              </p>
              <p className="mt-1.5 break-all font-mono text-sm font-bold tabular text-primary">
                {referral?.referralCode ?? "···"}
              </p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-ink-dim">Referred</span>
                <span className="font-mono font-medium text-ink">
                  {referral?.totalReferrals ?? 0}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-ink-dim">Earned</span>
                <Money value={referral?.totalEarned} size="sm" tone="primary" />
              </div>
              <Link
                href="/referrals"
                className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Invite friends <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardBody>
          </Card>

        </div>
      </div>

      {leaderboard && leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Top earners this week
            </CardTitle>
            <Link
              href="/referrals"
              className="text-xs font-medium text-primary hover:underline"
            >
              View leaderboard
            </Link>
          </CardHeader>
          <CardBody>
            <Leaderboard entries={leaderboard.slice(0, 3)} />
          </CardBody>
        </Card>
      )}

      <BottomSheet
        open={!!selectedTxn}
        onClose={() => setSelectedTxn(null)}
        title="Transaction details"
      >
        {selectedTxn && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-base-surface2 px-4 py-3.5">
              <div>
                <p className="text-xs text-ink-faint">Amount</p>
                <Money
                  value={selectedTxn.amount}
                  size="lg"
                  signed={selectedTxn.direction}
                  tone={selectedTxn.direction === "credit" ? "secondary" : "danger"}
                  className="mt-0.5"
                />
              </div>
              <StatusPill
                status={selectedTxn.direction === "credit" ? "completed" : "debited"}
              />
            </div>

            <DetailList
              rows={[
                {
                  label: "Type",
                  value: selectedTxn.type.replace(/_/g, " "),
                },
                { label: "Direction", value: selectedTxn.direction },
                { label: "Description", value: selectedTxn.description },
                {
                  label: "Balance after",
                  value: selectedTxn.balanceAfter
                    ? formatMoney(selectedTxn.balanceAfter)
                    : undefined,
                },
                { label: "Date", value: formatDateTime(selectedTxn.createdAt) },
              ]}
            />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
