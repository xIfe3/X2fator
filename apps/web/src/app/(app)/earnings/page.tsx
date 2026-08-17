"use client";

import { useState } from "react";
import { Coins } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { earningsApi } from "@/lib/api/earnings";
import type { EarningSource } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { formatDateTime, formatMoney } from "@/lib/utils";

const sources: { key: EarningSource | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "task", label: "Tasks" },
  { key: "referral", label: "Referrals" },
  { key: "bonus", label: "Bonuses" },
  { key: "adjustment", label: "Adjustments" },
];

export default function EarningsPage() {
  const [source, setSource] = useState<EarningSource | "all">("all");
  const { data: summary, isLoading: summaryLoading } = useApiQuery(() => earningsApi.summary());
  const { data: earnings, isLoading } = useApiQuery(
    () => (source === "all" ? earningsApi.list() : earningsApi.bySource(source)),
    [source],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Earnings</h1>
        <p className="mt-1 text-sm text-ink-dim">Everything credited to your earnings wallet.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {summaryLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <StatCard label="Lifetime earnings" value={formatMoney(summary?.total)} icon={Coins} tone="mint" />
            <StatCard label="Earned today" value={formatMoney(summary?.todayTotal ?? 0)} icon={Coins} tone="amber" />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <Tabs tabs={sources} active={source} onChange={(k) => setSource(k as EarningSource | "all")} />
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !earnings || earnings.length === 0 ? (
            <EmptyState icon={Coins} title="No earnings yet" description="Complete tasks or refer friends to start earning." />
          ) : (
            <Table>
              <THead>
                <Th>Description</Th>
                <Th>Source</Th>
                <Th>Date</Th>
                <Th className="text-right">Amount</Th>
              </THead>
              <tbody>
                {earnings.map((e) => (
                  <Tr key={e.id}>
                    <Td>{e.description || "—"}</Td>
                    <Td className="capitalize text-ink-dim">{e.source}</Td>
                    <Td className="text-ink-dim">{formatDateTime(e.createdAt)}</Td>
                    <Td className="text-right font-mono tabular font-medium text-mint">+{formatMoney(e.amount)}</Td>
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
