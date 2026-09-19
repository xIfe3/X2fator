"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Megaphone,
  ScrollText,
  Users,
  Wallet,
} from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { siteContentApi } from "@/lib/api/site-content";
import { ApiRequestError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

const links = [
  {
    href: "/admin/deposits",
    label: "Deposits",
    icon: ArrowDownToLine,
    desc: "Review and credit account deposits.",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    desc: "Suspend, activate, or block accounts.",
  },
  {
    href: "/admin/withdrawals",
    label: "Withdrawals",
    icon: Wallet,
    desc: "Review pending payout requests.",
  },
  {
    href: "/admin/tasks",
    label: "Tasks",
    icon: ClipboardList,
    desc: "Create and manage earning tasks.",
  },
  {
    href: "/admin/ads",
    label: "Ad campaigns",
    icon: Megaphone,
    desc: "Review campaigns and set ad pricing.",
  },
  {
    href: "/admin/audit",
    label: "Audit log",
    icon: ScrollText,
    desc: "See every admin action taken.",
  },
];

export default function AdminOverviewPage() {
  const { data: users, isLoading: usersLoading } = useApiQuery(() =>
    adminApi.users.list(),
  );
  const { data: ads, isLoading: adsLoading } = useApiQuery(() =>
    adminApi.ads.all(),
  );
  const { data: pendingWithdrawals, isLoading: withdrawalsLoading } =
    useApiQuery(() => adminApi.withdrawals.pending());
  const { data: deposits, isLoading: depositsLoading } = useApiQuery(() =>
    adminApi.deposits.all(),
  );
  const { data: totals, isLoading: totalsLoading } = useApiQuery(() =>
    adminApi.wallets.totals(),
  );
  const { data: recentTxns, isLoading: recentTxnsLoading } = useApiQuery(() =>
    adminApi.wallets.recentTransactions(8),
  );
  const { data: siteContent, refetch: refetchSiteContent } = useApiQuery(() =>
    siteContentApi.get(),
  );
  const [welcomeAmount, setWelcomeAmount] = useState("");
  const [savingWelcomeAmount, setSavingWelcomeAmount] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    if (siteContent?.welcome_bonus?.amount) {
      setWelcomeAmount(siteContent.welcome_bonus.amount);
    }
  }, [siteContent]);

  async function saveWelcomeAmount() {
    const amount = Number(welcomeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      push("error", "Enter a welcome bonus amount greater than zero.");
      return;
    }

    setSavingWelcomeAmount(true);
    try {
      await adminApi.siteContent.update("welcome_bonus", {
        enabled: true,
        amount: amount.toFixed(2),
      });
      await refetchSiteContent();
      push("success", "Welcome bonus updated.");
    } catch (error) {
      push(
        "error",
        error instanceof ApiRequestError
          ? error.message
          : "Could not update the welcome bonus.",
      );
    } finally {
      setSavingWelcomeAmount(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Admin console
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Actions here require the{" "}
          <span className="font-mono text-secondary">admin</span> role and the
          specific permission for each action (guarded server-side by{" "}
          <span className="font-mono">PermissionsGuard</span>).
        </p>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-faint">
          Platform-wide wallet balances
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {totalsLoading
            ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)
            : [
                ["Account wallets", totals?.account, "text-ink"],
                ["Task wallets", totals?.task, "text-secondary"],
                ["Referral wallets", totals?.referral, "text-primary"],
                ["Total across all users", totals?.total, "text-primary"],
              ].map(([label, amount, tone]) => (
                <Card key={label}>
                  <CardBody>
                    <p className="text-xs uppercase tracking-wider text-ink-faint">
                      {label}
                    </p>
                    <Money
                      value={amount as string | undefined}
                      size="lg"
                      className={`mt-2 block ${tone}`}
                    />
                  </CardBody>
                </Card>
              ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {usersLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-ink-faint">
                Total users
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular text-ink">
                {users?.length ?? 0}
              </p>
            </CardBody>
          </Card>
        )}
        {adsLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-ink-faint">
                Pending ad campaigns
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular text-secondary">
                {ads?.filter((ad) => ad.status === "pending").length ?? 0}
              </p>
            </CardBody>
          </Card>
        )}
        {withdrawalsLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-ink-faint">
                Pending withdrawals
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular text-secondary">
                {pendingWithdrawals?.length ?? 0}
              </p>
            </CardBody>
          </Card>
        )}
        {depositsLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-ink-faint">
                Pending deposits
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular text-secondary">
                {deposits?.filter((deposit) => deposit.status === "pending")
                  .length ?? 0}
              </p>
            </CardBody>
          </Card>
        )}
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Welcome bonus</p>
            <p className="mt-1 text-xs text-ink-dim">
              Set the amount shown to new users on the login page.
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Input
              aria-label="Welcome bonus amount"
              type="number"
              min="1"
              step="0.01"
              value={welcomeAmount}
              onChange={(event) => setWelcomeAmount(event.target.value)}
              className="min-w-0 sm:w-40"
            />
            <Button
              type="button"
              onClick={saveWelcomeAmount}
              isLoading={savingWelcomeAmount}
            >
              Save amount
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-start gap-3 rounded-2xl border border-base-border bg-base-surface p-5 transition-colors hover:border-secondary/40 hover:bg-base-surface2"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-base-surface2 text-secondary">
              <l.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">{l.label}</p>
              <p className="mt-0.5 text-xs text-ink-dim">{l.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardBody>
          {recentTxnsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : !recentTxns || recentTxns.length === 0 ? (
            <EmptyState icon={Wallet} title="No activity yet" />
          ) : (
            <div className="space-y-1">
              {recentTxns.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-base-surface2"
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
                    <p className="truncate text-sm font-medium text-ink">
                      {t.userFirstName} {t.userLastName}{" "}
                      <span className="font-normal capitalize text-ink-faint">
                        · {t.walletType} · {t.type.replace(/_/g, " ")}
                      </span>
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
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
