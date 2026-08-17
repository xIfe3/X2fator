"use client";

import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Coins, ListChecks, ShieldCheck, Users, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useApiQuery } from "@/hooks/useApiQuery";
import { walletApi } from "@/lib/api/wallet";
import { earningsApi } from "@/lib/api/earnings";
import { kycApi } from "@/lib/api/kyc";
import { referralsApi } from "@/lib/api/referrals";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const quickActions = [
  { href: "/deposits", label: "Deposit", icon: ArrowDownToLine },
  { href: "/withdrawals", label: "Withdraw", icon: ArrowUpFromLine },
  { href: "/plans", label: "Browse plans", icon: Wallet },
  { href: "/tasks", label: "Do a task", icon: ListChecks },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: balance, isLoading: balanceLoading } = useApiQuery(() => walletApi.getBalance());
  const { data: txns, isLoading: txnsLoading } = useApiQuery(() => walletApi.getTransactions("account"));
  const { data: summary } = useApiQuery(() => earningsApi.summary());
  const { data: kyc } = useApiQuery(() => kycApi.status());
  const { data: referral } = useApiQuery(() => referralsApi.me());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Welcome back, {user?.firstName}</h1>
        <p className="mt-1 text-sm text-ink-dim">Here&apos;s where your ledger stands today.</p>
      </div>

      {kyc && kyc.status !== "approved" && (
        <Card className="border-amber-dim/40 bg-amber-soft">
          <CardBody className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-amber" />
              <div>
                <p className="text-sm font-medium text-ink">
                  {kyc.status === "unsubmitted" ? "Verify your identity" : "KYC verification " + kyc.status}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {balanceLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <StatCard label="Total balance" value={formatMoney(balance?.total)} icon={Wallet} tone="mint" />
            <StatCard label="Account wallet" value={formatMoney(balance?.account)} icon={ArrowDownToLine} />
            <StatCard
              label="Earnings wallet"
              value={formatMoney(balance?.earnings)}
              icon={Coins}
              tone="amber"
              sub={summary ? `${formatMoney(summary.total)} lifetime` : undefined}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-base-border bg-base-surface p-4 text-center transition-colors hover:border-mint/40 hover:bg-base-surface2"
          >
            <a.icon className="h-5 w-5 text-mint" />
            <span className="text-xs font-medium text-ink">{a.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent wallet activity</CardTitle>
            <Link href="/wallet" className="text-xs font-medium text-mint hover:underline">
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
              <EmptyState icon={Wallet} title="No transactions yet" description="Your deposits and withdrawals will show up here." />
            ) : (
              <div className="divide-y divide-base-border">
                {txns.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium capitalize text-ink">{t.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-ink-faint">{formatDateTime(t.createdAt)}</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Referrals</CardTitle>
            <Users className="h-4 w-4 text-ink-faint" />
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <p className="text-xs text-ink-faint">Your code</p>
              <p className="font-mono text-lg font-semibold tabular text-amber">{referral?.referralCode ?? "···"}</p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-dim">Total referred</span>
              <span className="font-mono font-medium text-ink">{referral?.totalReferrals ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-dim">Earned</span>
              <span className="font-mono font-medium text-mint">{formatMoney(referral?.totalEarned)}</span>
            </div>
            <Link href="/referrals">
              <Button size="sm" variant="secondary" className="w-full">
                View referrals
              </Button>
            </Link>
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
