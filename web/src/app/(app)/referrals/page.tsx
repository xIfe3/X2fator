"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Trophy, Users } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { referralsApi } from "@/lib/api/referrals";
import type { Referral } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DetailList } from "@/components/ui/DetailList";
import { formatDate, formatDateTime, formatMoney, maskEmail } from "@/lib/utils";
import { Leaderboard } from "./Leaderboard";

export default function ReferralsPage() {
  const { data: info, isLoading: infoLoading } = useApiQuery(() => referralsApi.me());
  const { data: referrals, isLoading } = useApiQuery(() => referralsApi.list());
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(
    null,
  );
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"week" | "all">(
    "week",
  );
  const { data: leaderboard, isLoading: leaderboardLoading } = useApiQuery(
    () => referralsApi.leaderboard(leaderboardPeriod),
    [leaderboardPeriod],
  );
  const [copied, setCopied] = useState(false);

  const link =
    info?.referralLink ??
    (info?.referralCode && typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${info.referralCode}`
      : undefined);

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Referrals</h1>
        <p className="mt-1 text-sm text-ink-dim">Invite friends and earn when they join.</p>
      </div>

      <Card>
        <CardBody className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs text-ink-faint">Your referral code</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular text-secondary">
              {infoLoading ? "···" : info?.referralCode}
            </p>
          </div>
          <Button variant="secondary" onClick={copy} disabled={!link}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy invite link"}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Top earners
          </CardTitle>
          <Tabs
            tabs={[
              { key: "week", label: "This week" },
              { key: "all", label: "All time" },
            ]}
            active={leaderboardPeriod}
            onChange={(k) => setLeaderboardPeriod(k as "week" | "all")}
          />
        </CardHeader>
        <CardBody>
          {leaderboardLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <Leaderboard entries={leaderboard} />
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {infoLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <StatCard label="Total referred" value={String(info?.totalReferrals ?? 0)} icon={Users} tone="primary" />
            <StatCard label="Earned from referrals" value={formatMoney(info?.totalEarned)} icon={Users} tone="secondary" />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <Link
            href="/wallet?type=referral"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !referrals || referrals.length === 0 ? (
            <EmptyState icon={Users} title="No referrals yet" description="Share your code above to start earning." />
          ) : (
            <div className="space-y-2.5">
              {referrals.slice(0, 5).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReferral(r)}
                  className="flex w-full items-center gap-3 rounded-xl border border-base-border bg-base-raised p-4 text-left transition-colors hover:border-base-borderStrong"
                >
                  <Avatar firstName={r.firstName} lastName={r.lastName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {r.firstName} {r.lastName}
                    </p>
                    <p className="truncate text-xs text-ink-faint">
                      {maskEmail(r.email)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      Joined {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <BottomSheet
        open={!!selectedReferral}
        onClose={() => setSelectedReferral(null)}
        title="Referral details"
      >
        {selectedReferral && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-base-surface2 px-4 py-3.5">
              <Avatar
                firstName={selectedReferral.firstName}
                lastName={selectedReferral.lastName}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {selectedReferral.firstName} {selectedReferral.lastName}
                </p>
                <p className="truncate text-xs text-ink-faint">
                  {maskEmail(selectedReferral.email)}
                </p>
              </div>
              <StatusPill status={selectedReferral.status} />
            </div>

            <DetailList
              rows={[
                {
                  label: "Name",
                  value: `${selectedReferral.firstName} ${selectedReferral.lastName}`,
                  capitalize: false,
                },
                { label: "Email", value: maskEmail(selectedReferral.email) },
                { label: "Status", value: selectedReferral.status },
                {
                  label: "Joined",
                  value: formatDateTime(selectedReferral.createdAt),
                },
              ]}
            />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
