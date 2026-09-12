"use client";

import { useState } from "react";
import { Coins } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { earningsApi } from "@/lib/api/earnings";
import type { EarningSource } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { Money } from "@/components/ui/Money";
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
  const { data: summary, isLoading: summaryLoading } = useApiQuery(() =>
    earningsApi.summary(),
  );
  const { data: earnings, isLoading } = useApiQuery(
    () => (source === "all" ? earningsApi.list() : earningsApi.bySource(source)),
    [source],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Earnings
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Everything credited to your earnings wallet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {summaryLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <StatCard
              label="Lifetime earnings"
              value={formatMoney(summary?.total)}
              icon={Coins}
              tone="primary"
            />
            <StatCard
              label="Earned today"
              value={formatMoney(summary?.todayTotal ?? 0)}
              icon={Coins}
              tone="secondary"
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <Tabs
            tabs={sources}
            active={source}
            onChange={(k) => setSource(k as EarningSource | "all")}
          />
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !earnings || earnings.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="No earnings yet"
              description="Complete tasks or refer friends to start earning."
            />
          ) : (
            <div className="space-y-2.5">
              {earnings.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-4 rounded-xl border border-base-border bg-base-raised p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Coins className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {e.description || "—"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
                      <span className="capitalize">{e.source}</span>
                      <span>·</span>
                      <span>{formatDateTime(e.createdAt)}</span>
                    </div>
                  </div>
                  <Money value={e.amount} size="sm" tone="primary" signed="credit" />
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
