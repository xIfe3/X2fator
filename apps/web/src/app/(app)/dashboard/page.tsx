"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Cable,
  Coins,
  Gift,
  ListChecks,
  Megaphone,
  ShieldCheck,
  Stamp,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useApiQuery } from "@/hooks/useApiQuery";
import { walletApi } from "@/lib/api/wallet";
import { earningsApi } from "@/lib/api/earnings";
import { kycApi } from "@/lib/api/kyc";
import { referralsApi } from "@/lib/api/referrals";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { bonusesApi } from "@/lib/api/bonuses";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";

const quickActions = [
  { href: "/tasks", label: "Complete a task", icon: ListChecks, tone: "mint" },
  { href: "/utilities", label: "Pay a bill", icon: Cable, tone: "amber" },
  {
    href: "/deposits",
    label: "Add money",
    icon: ArrowDownToLine,
    tone: "mint",
  },
  {
    href: "/withdrawals",
    label: "Withdraw earnings",
    icon: ArrowUpFromLine,
    tone: "amber",
  },
  { href: "/plans", label: "Explore plans", icon: Wallet, tone: "mint" },
  { href: "/referrals", label: "Invite a friend", icon: Users, tone: "amber" },
  { href: "/earnings", label: "View earnings", icon: Coins, tone: "mint" },
  { href: "/support", label: "Get support", icon: Megaphone, tone: "amber" },
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
  const { data: kyc } = useApiQuery(() => kycApi.status());
  const { data: referral } = useApiQuery(() => referralsApi.me());
  const { data: dailyBonus, refetch: refetchBonus } = useApiQuery(() =>
    bonusesApi.daily(),
  );
  const [claimingBonus, setClaimingBonus] = useState(false);
  const { push } = useToast();

  async function claimBonus() {
    setClaimingBonus(true);
    try {
      await bonusesApi.claimDaily();
      await refetchBonus();
      push("success", "Daily bonus added to your earnings wallet.");
    } catch (error) {
      push(
        "error",
        error instanceof ApiRequestError
          ? error.message
          : "Could not claim your bonus.",
      );
    } finally {
      setClaimingBonus(false);
    }
  }

  return (
    <div className="space-y-8">
      {kyc && kyc.status !== "approved" && (
        <Card className="border-amber-dim/40 bg-amber-soft">
          <CardBody className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-amber" />
              <div>
                <p className="text-sm font-medium text-ink">
                  {kyc.status === "unsubmitted"
                    ? "Verify your identity"
                    : "KYC verification " + kyc.status}
                </p>
                <p className="text-xs text-ink-dim">
                  Complete KYC to unlock withdrawals and higher deposit limits.
                </p>
              </div>
            </div>
            <Link href="/kyc">
              <Button size="sm" variant="secondary">
                Review
              </Button>
            </Link>
          </CardBody>
        </Card>
      )}

      {/* Ledger statement hero */}
      <div className="overflow-hidden rounded-2xl border border-base-border bg-base-surface shadow-panel">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-ink-faint">
              Statement summary
            </p>
            <h1 className="mt-1 font-display text-xl font-semibold text-ink sm:text-2xl">
              Welcome back, {user?.firstName}
            </h1>
            {balanceLoading ? (
              <Skeleton className="mt-5 h-10 w-48" />
            ) : (
              <p className="mt-5 font-mono text-4xl font-semibold tabular text-ink sm:text-5xl">
                {formatMoney(balance?.total)}
              </p>
            )}
            <p className="mt-1.5 text-xs text-ink-faint">
              Total balance across both wallets
            </p>
          </div>

          <span className="stamp-badge shrink-0 self-start text-mint">
            <Stamp className="h-3.5 w-3.5" /> Verified ledger
          </span>
        </div>

        <div className="ledger-tear mx-6 sm:mx-8" />

        <div className="grid grid-cols-1 divide-y divide-base-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="flex items-center justify-between gap-3 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-soft text-mint">
                <ArrowDownToLine className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-xs text-ink-faint">Account wallet</p>
                <p className="font-mono text-lg font-semibold tabular text-ink">
                  {formatMoney(balance?.account)}
                </p>
              </div>
            </div>
            <Link href="/deposits">
              <Button size="sm" variant="outline">
                Deposit
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between gap-3 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-soft text-amber">
                <Coins className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-xs text-ink-faint">Earnings wallet</p>
                <p className="font-mono text-lg font-semibold tabular text-ink">
                  {formatMoney(balance?.earnings)}
                </p>
                {summary && (
                  <p className="text-[11px] text-ink-faint">
                    {formatMoney(summary.total)} lifetime
                  </p>
                )}
              </div>
            </div>
            <Link href="/withdrawals">
              <Button size="sm" variant="outline">
                Withdraw
              </Button>
            </Link>
          </div>
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
              className="group flex min-h-20 items-center gap-3 rounded-xl border border-base-border bg-base-surface p-4 transition-colors hover:border-mint-dim/50 hover:bg-base-surface2"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105 ${a.tone === "amber" ? "bg-amber-soft text-amber" : "bg-mint-soft text-mint"}`}
              >
                <a.icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-medium text-ink">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <Card className="border-mint-dim/40 bg-mint-soft/50">
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint text-base shadow-stamp">
              <Gift className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                Daily login bonus
              </p>
              <p className="mt-0.5 text-xs text-ink-dim">
                {dailyBonus?.claimed
                  ? "You have claimed today's bonus. Come back tomorrow."
                  : `Claim ${formatMoney(dailyBonus?.amount)} for checking in today.`}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={claimBonus}
            disabled={dailyBonus?.claimed || claimingBonus}
            isLoading={claimingBonus}
          >
            {dailyBonus?.claimed ? "Claimed today" : "Claim bonus"}
          </Button>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent wallet activity</CardTitle>
            <Link
              href="/wallet"
              className="text-xs font-medium text-mint hover:underline"
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
                      borderLeft: `2px solid ${t.direction === "credit" ? "var(--color-mint-dim)" : "var(--color-base-border)"}`,
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
                        (t.direction === "credit" ? "text-mint" : "text-danger")
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

        {/* Referral "member card" */}
        <div className="overflow-hidden rounded-2xl border border-base-border bg-base-surface shadow-panel">
          <div className="flex items-center justify-between p-5 pb-0">
            <p className="font-display text-sm font-semibold tracking-wide text-ink">
              Referral card
            </p>
            <Users className="h-4 w-4 text-ink-faint" />
          </div>
          <div className="p-5">
            <div className="rounded-xl border border-dashed border-mint-dim/40 bg-mint-soft/60 p-4 text-center">
              <p className="text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                Your code
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular text-mint">
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
              <span className="font-mono font-medium text-mint">
                {formatMoney(referral?.totalEarned)}
              </span>
            </div>
            <Link href="/referrals">
              <Button size="sm" variant="secondary" className="mt-4 w-full">
                View referrals
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {user && (
        <p className="text-center text-xs text-ink-faint">
          Account status: <StatusPill status={user.status} />
        </p>
      )}
    </div>
  );
}
