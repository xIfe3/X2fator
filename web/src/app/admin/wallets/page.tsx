"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, BookOpen } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Money } from "@/components/ui/Money";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateTime } from "@/lib/utils";

const TRANSACTION_TYPES = [
  "deposit",
  "plan_purchase",
  "task_reward",
  "referral_commission",
  "withdrawal",
  "airtime_purchase",
  "data_purchase",
  "fee",
  "refund",
  "adjustment",
];

export default function AdminWalletsLedgerPage() {
  const [filters, setFilters] = useState({
    walletType: "",
    transactionType: "",
    direction: "",
    status: "",
  });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useApiQuery(
    () =>
      adminApi.wallets.ledger({
        walletType: (filters.walletType || undefined) as
          | "account"
          | "task"
          | "referral"
          | undefined,
        transactionType: filters.transactionType || undefined,
        direction: (filters.direction || undefined) as
          | "credit"
          | "debit"
          | undefined,
        status: filters.status || undefined,
        page,
        pageSize: 30,
      }),
    [filters, page],
  );

  function updateFilter<K extends keyof typeof filters>(
    key: K,
    value: (typeof filters)[K],
  ) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Wallet ledger
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Every balance-changing transaction across every user — the
          platform's full financial audit trail.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Filters
          </CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Select
            label="Wallet"
            value={filters.walletType}
            onChange={(e) => updateFilter("walletType", e.target.value)}
          >
            <option value="">All wallets</option>
            <option value="account">Account</option>
            <option value="task">Task</option>
            <option value="referral">Referral</option>
          </Select>
          <Select
            label="Transaction type"
            value={filters.transactionType}
            onChange={(e) => updateFilter("transactionType", e.target.value)}
          >
            <option value="">All types</option>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
          <Select
            label="Direction"
            value={filters.direction}
            onChange={(e) => updateFilter("direction", e.target.value)}
          >
            <option value="">All</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </Select>
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="reversed">Reversed</option>
          </Select>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {data ? `${data.total.toLocaleString()} transactions` : "Transactions"}
          </CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No transactions"
              description="No wallet transactions match these filters."
            />
          ) : (
            <div className="space-y-2.5">
              {data.items.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col gap-2 rounded-xl border border-base-border bg-base-raised p-4 sm:flex-row sm:items-center sm:gap-4"
                >
                  <span
                    className={
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full " +
                      (t.direction === "credit"
                        ? "bg-secondary-soft text-secondary"
                        : "bg-danger-soft text-danger")
                    }
                  >
                    {t.direction === "credit" ? (
                      <ArrowDownToLine className="h-4.5 w-4.5" />
                    ) : (
                      <ArrowUpFromLine className="h-4.5 w-4.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {t.userFirstName} {t.userLastName}{" "}
                      <span className="font-normal capitalize text-ink-faint">
                        · {t.walletType} · {t.type.replace(/_/g, " ")}
                      </span>
                    </p>
                    <p className="truncate text-xs text-ink-faint">
                      {t.userEmail}
                      {t.reference ? ` · ${t.reference}` : ""}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      {formatDateTime(t.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Money
                      value={t.amount}
                      size="sm"
                      signed={t.direction}
                      tone={t.direction === "credit" ? "secondary" : "danger"}
                    />
                    {t.balanceBefore !== undefined &&
                      t.balanceAfter !== undefined && (
                        <p className="text-[11px] text-ink-faint">
                          {formatBalanceChange(t.balanceBefore, t.balanceAfter)}
                        </p>
                      )}
                    {t.status && <StatusPill status={t.status} />}
                  </div>
                </div>
              ))}
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                onChange={setPage}
              />
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function formatBalanceChange(before: string, after: string) {
  return `${Number(before).toLocaleString()} → ${Number(after).toLocaleString()}`;
}
