"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Wallet as WalletIcon } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { walletApi } from "@/lib/api/wallet";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default function WalletPage() {
  const [type, setType] = useState<"account" | "earnings">("account");
  const { data: wallets, isLoading: walletsLoading } = useApiQuery(() => walletApi.getWallets());
  const { data: txns, isLoading: txnsLoading } = useApiQuery(() => walletApi.getTransactions(type), [type]);

  if (walletsLoading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Wallet</h1>
          <p className="mt-1 text-sm text-ink-dim">Your account and earnings balances, side by side.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/deposits">
            <Button size="sm">
              <ArrowDownToLine className="h-4 w-4" /> Deposit
            </Button>
          </Link>
          <Link href="/withdrawals">
            <Button size="sm" variant="secondary">
              <ArrowUpFromLine className="h-4 w-4" /> Withdraw
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="relative overflow-hidden">
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-ink-faint">Account wallet</p>
                <p className="mt-2 font-mono text-2xl font-semibold tabular text-ink">
                  {formatMoney(wallets?.account.balance)}
                </p>
                <p className="mt-1 text-xs text-ink-faint">Status: {wallets?.account.status ?? "—"}</p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint-soft text-mint">
                <ArrowDownToLine className="h-4 w-4" />
              </span>
            </div>
            <div className="flex gap-2 border-t border-base-border pt-4">
              <Link href="/deposits" className="flex-1">
                <Button size="sm" className="w-full">
                  Deposit
                </Button>
              </Link>
              <Link href="/withdrawals" className="flex-1">
                <Button size="sm" variant="outline" className="w-full">
                  Withdraw
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card className="relative overflow-hidden">
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-ink-faint">Earnings wallet</p>
                <p className="mt-2 font-mono text-2xl font-semibold tabular text-ink">
                  {formatMoney(wallets?.earnings.balance)}
                </p>
                <p className="mt-1 text-xs text-ink-faint">Status: {wallets?.earnings.status ?? "—"}</p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-soft text-amber">
                <WalletIcon className="h-4 w-4" />
              </span>
            </div>
            <div className="flex gap-2 border-t border-base-border pt-4">
              <Link href="/withdrawals" className="flex-1">
                <Button size="sm" className="w-full">
                  Withdraw earnings
                </Button>
              </Link>
              <Link href="/tasks" className="flex-1">
                <Button size="sm" variant="outline" className="w-full">
                  Earn more
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
          <Tabs
            tabs={[
              { key: "account", label: "Account" },
              { key: "earnings", label: "Earnings" },
            ]}
            active={type}
            onChange={(k) => setType(k as "account" | "earnings")}
          />
        </CardHeader>
        <CardBody>
          {txnsLoading ? (
            <PageSkeleton />
          ) : !txns || txns.length === 0 ? (
            <EmptyState
              icon={ArrowUpFromLine}
              title="No transactions"
              description={`No ${type} wallet activity yet.`}
            />
          ) : (
            <Table>
              <THead>
                <Th>Description</Th>
                <Th>Type</Th>
                <Th>Date</Th>
                <Th className="text-right">Amount</Th>
              </THead>
              <tbody>
                {txns.map((t) => (
                  <Tr key={t.id}>
                    <Td className="capitalize">{t.description || t.type.replace(/_/g, " ")}</Td>
                    <Td className="capitalize text-ink-dim">{t.direction}</Td>
                    <Td className="text-ink-dim">{formatDateTime(t.createdAt)}</Td>
                    <Td
                      className={
                        "text-right font-mono tabular font-medium " +
                        (t.direction === "credit" ? "text-mint" : "text-danger")
                      }
                    >
                      {t.direction === "credit" ? "+" : "−"}
                      {formatMoney(t.amount)}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
