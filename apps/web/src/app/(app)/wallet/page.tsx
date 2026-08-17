"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Wallet as WalletIcon } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { walletApi } from "@/lib/api/wallet";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
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
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Wallet</h1>
        <p className="mt-1 text-sm text-ink-dim">Your account and earnings balances, side by side.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Account wallet"
          value={formatMoney(wallets?.account.balance)}
          icon={ArrowDownToLine}
          tone="mint"
          sub={`Status: ${wallets?.account.status ?? "—"}`}
        />
        <StatCard
          label="Earnings wallet"
          value={formatMoney(wallets?.earnings.balance)}
          icon={WalletIcon}
          tone="amber"
          sub={`Status: ${wallets?.earnings.status ?? "—"}`}
        />
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
