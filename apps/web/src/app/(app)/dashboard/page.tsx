"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Cable,
  ChevronLeft,
  ChevronRight,
  Coins,
  Gift,
  ListChecks,
  Megaphone,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useApiQuery } from "@/hooks/useApiQuery";
import { walletApi } from "@/lib/api/wallet";
import { earningsApi } from "@/lib/api/earnings";
import { referralsApi } from "@/lib/api/referrals";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { bonusesApi } from "@/lib/api/bonuses";

const quickActions = [
  { href: "/tasks", label: "Complete a task", icon: ListChecks, tone: "primary" },
  { href: "/utilities", label: "Pay a bill", icon: Cable, tone: "secondary" },
  {
    href: "/deposits",
    label: "Add money",
    icon: ArrowDownToLine,
    tone: "primary",
  },
  {
    href: "/withdrawals",
    label: "Withdraw task rewards",
    icon: ArrowUpFromLine,
    tone: "secondary",
  },
  { href: "/referrals", label: "Invite a friend", icon: Users, tone: "secondary" },
  { href: "/earnings", label: "View earnings", icon: Coins, tone: "primary" },
  { href: "/support", label: "Get support", icon: Megaphone, tone: "secondary" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: balance, isLoading: balanceLoading } = useApiQuery(() =>
    walletApi.getBalance(),
  );
  const { data: txns, isLoading: txnsLoading } = useApiQuery(() =>
    walletApi.getTransactions("account"),
  );
  const { data: summary } = useApiQuery(() => earningsApi.summary());
  const { data: referral } = useApiQuery(() => referralsApi.me());
  const { data: leaderboard, isLoading: leaderboardLoading } = useApiQuery(() =>
    referralsApi.leaderboard(),
  );
  const { data: dailyBonus } = useApiQuery(() => bonusesApi.daily());
  const [promoIndex, setPromoIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPromoIndex((current) => (current + 1) % 2);
    }, 4500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-8">
      {/* Ledger statement hero */}
      <div className="balance-gradient overflow-hidden rounded-2xl border-0 p-1 text-white">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-medium text-white/75">Total balance</p>
            <h1 className="mt-1 font-display text-xl font-semibold text-white sm:text-2xl">
              Welcome back, {user?.firstName}
            </h1>
            {balanceLoading ? (
              <Skeleton className="mt-5 h-10 w-48" />
            ) : (
              <p className="mt-5 font-mono text-4xl font-semibold tabular text-white sm:text-5xl">
                {formatMoney(balance?.total)}
              </p>
            )}
          </div>

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
            <Wallet className="h-4 w-4" />
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 px-4 pb-4 sm:px-6 sm:pb-6">
          {[
            ["Task wallet", balance?.task, Coins],
            ["Deposit wallet", balance?.account, ArrowDownToLine],
            ["Affiliate wallet", balance?.referral, Users],
          ].map(([label, amount, Icon]) => {
            const WalletIcon = Icon as typeof Coins;
            return (
              <div key={label as string} className="rounded-xl bg-white/15 p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-white/75">
                  <WalletIcon className="h-3.5 w-3.5" />
                  <span>{label as string}</span>
                </div>
                <p className="mt-2 font-mono text-sm font-semibold tabular text-white">
                  {formatMoney(amount as string | number | undefined)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-ink-faint">
              Today
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-ink">
              Make your next move
            </h2>
          </div>
          <span className="hidden text-xs text-ink-faint sm:block">
            Small actions, steady progress
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-base-border bg-base-surface p-3 text-center shadow-[0_8px_20px_-18px_rgba(44,82,151,0.55)] transition-colors hover:border-primary-dim/50 hover:bg-base-surface2"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105 ${a.tone === "secondary" ? "bg-secondary-soft text-secondary" : "bg-primary-soft text-primary"}`}
              >
                <a.icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-medium text-ink">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <Link href="/bonuses" className="block">
        <Card className="border-primary-dim/40 bg-primary-soft/50 transition-colors hover:border-primary-dim/70">
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-base shadow-stamp">
                <Gift className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">
                  Daily login streak
                </p>
                <p className="mt-0.5 text-xs text-ink-dim">
                  {dailyBonus?.claimed
                    ? `Day ${dailyBonus.currentStreak} streak. Come back tomorrow for day ${dailyBonus.currentStreak + 1}.`
                    : `Claim ${formatMoney(dailyBonus?.amount)} today — day ${dailyBonus?.nextStreak ?? 1} of ${dailyBonus?.milestoneDays ?? 30}.`}
                </p>
              </div>
            </div>
            <Button size="sm" disabled={dailyBonus?.claimed}>
              {dailyBonus?.claimed ? "Claimed today" : "Claim bonus"}
            </Button>
          </CardBody>
        </Card>
      </Link>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent wallet activity</CardTitle>
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
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : !txns || txns.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No transactions yet"
                description="Your deposits and withdrawals will show up here."
              />
            ) : (
              <div>
                {txns.slice(0, 6).map((t, i) => (
                  <div
                    key={t.id}
                    className={
                      "flex items-center justify-between py-3.5 pl-4 " +
                      (i > 0 ? "border-t border-dashed border-base-border" : "")
                    }
                    style={{
                      borderLeft: `2px solid ${t.direction === "credit" ? "var(--color-primary-dim)" : "var(--color-base-border)"}`,
                    }}
                  >
                    <div>
                      <p className="text-sm font-medium capitalize text-ink">
                        {t.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {formatDateTime(t.createdAt)}
                      </p>
                    </div>
                    <p
                      className={
                        "font-mono text-sm font-semibold tabular " +
                        (t.direction === "credit" ? "text-primary" : "text-danger")
                      }
                    >
                      {t.direction === "credit" ? "+" : "−"}
                      {formatMoney(t.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <div className="relative overflow-hidden rounded-2xl brand-gradient p-5 text-white shadow-[0_12px_25px_-16px_rgba(37,99,235,0.8)]">
            <div className="flex min-h-32 items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold">
                  {promoIndex === 0 ? "Have a Gift Code?" : "Refer & Earn"}
                </p>
                <p className="mt-1.5 max-w-[270px] text-sm leading-5 text-white/85">
                  {promoIndex === 0
                    ? "Tap to redeem and get wallet credits. Need a code? Check our Telegram."
                    : "Earn rewards for every friend who joins through your referral link."}
                </p>
                <Link
                  href={promoIndex === 0 ? "/referrals" : "/referrals"}
                  className="mt-4 inline-flex items-center gap-1 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-primary"
                >
                  {promoIndex === 0 ? "View gift codes" : "View referrals"}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl">
                {promoIndex === 0 ? (
                  <Gift className="h-6 w-6" />
                ) : (
                  <Users className="h-6 w-6" />
                )}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous promotion"
                onClick={() => setPromoIndex((current) => (current + 1) % 2)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5">
                {[0, 1].map((index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Show promotion ${index + 1}`}
                    onClick={() => setPromoIndex(index)}
                    className={`h-1.5 rounded-full transition-all ${promoIndex === index ? "w-5 bg-white" : "w-1.5 bg-white/45"}`}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Next promotion"
                onClick={() => setPromoIndex((current) => (current + 1) % 2)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referral card</CardTitle>
            <Users className="h-4 w-4 text-ink-faint" />
          </CardHeader>
          <CardBody>
            <div className="rounded-xl border border-dashed border-primary-dim/40 bg-primary-soft/60 p-4 text-center">
              <p className="text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                Your code
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular text-primary">
                {referral?.referralCode ?? "···"}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-ink-dim">Total referred</span>
              <span className="font-mono font-medium text-ink">
                {referral?.totalReferrals ?? 0}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-ink-dim">Earned</span>
              <span className="font-mono font-medium text-primary">
                {formatMoney(referral?.totalEarned)}
              </span>
            </div>
            <Link href="/referrals">
              <Button size="sm" variant="secondary" className="mt-4 w-full">
                View referrals
              </Button>
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Referral leaderboard</CardTitle>
              <p className="mt-1 text-xs text-ink-dim">Top three referrers</p>
            </div>
            <Trophy className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardBody>
            {leaderboardLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : !leaderboard || leaderboard.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No leaders yet"
                description="Invite friends to appear on the leaderboard."
              />
            ) : (
              <div className="flex min-h-48 items-end justify-center gap-2 px-2 pt-5">
                {[1, 0, 2].map((entryIndex) => {
                  const entry = leaderboard[entryIndex];
                  if (!entry) return <div key={entryIndex} className="w-1/3" />;
                  const rank = entryIndex + 1;
                  const isWinner = rank === 1;
                  return (
                    <div
                      key={entry.userId}
                      className="flex w-1/3 flex-col items-center"
                    >
                      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Users className="h-4 w-4" />
                      </div>
                      <p className="w-full truncate text-center text-xs font-semibold text-ink">
                        {entry.firstName} {entry.lastName}
                      </p>
                      <div
                        className={`mt-2 flex w-full flex-col items-center justify-center rounded-t-xl brand-gradient px-1 text-white ${isWinner ? "h-28" : rank === 2 ? "h-20" : "h-16"}`}
                      >
                        <span className="text-lg font-bold">#{rank}</span>
                        <span className="mt-1 text-xs font-semibold">
                          {entry.referralCount} refs
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {user && (
        <p className="text-center text-xs text-ink-faint">
          Account status: <StatusPill status={user.status} />
        </p>
      )}
    </div>
  );
}
