"use client";

import { useState } from "react";
import { Award, TrendingUp, Wallet2 } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Select } from "@/components/ui/Input";
import { Money } from "@/components/ui/Money";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DetailList } from "@/components/ui/DetailList";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDateTime, formatMoney } from "@/lib/utils";

const STATUSES = ["pending", "active", "completed", "cancelled", "expired"];

export default function AdminSubscriptionsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: stats } = useApiQuery(() => adminApi.subscriptions.stats());
  const { data, isLoading } = useApiQuery(
    () =>
      adminApi.subscriptions.all({
        status: status || undefined,
        page,
        pageSize: 30,
      }),
    [status, page],
  );
  const { data: selectedSub, isLoading: selectedLoading } = useApiQuery(
    () => (selectedId ? adminApi.subscriptions.get(selectedId) : Promise.resolve(null)),
    [selectedId],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Subscriptions
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Every plan investment across every user.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Active capital"
          value={stats ? `₦${Number(stats.activeCapital).toLocaleString()}` : "—"}
          icon={Wallet2}
          sub={
            stats
              ? `${stats.counts.active.toLocaleString()} active subscriptions`
              : undefined
          }
        />
        <StatCard
          label="Total invested"
          value={stats ? `₦${Number(stats.totalRevenue).toLocaleString()}` : "—"}
          icon={TrendingUp}
          tone="secondary"
          sub={
            stats
              ? `${stats.totalSubscriptions.toLocaleString()} subscriptions all-time`
              : undefined
          }
        />
        <StatCard
          label="Completed"
          value={stats ? stats.counts.completed.toLocaleString() : "—"}
          icon={Award}
          sub={
            stats
              ? `${stats.counts.cancelled} cancelled · ${stats.counts.expired} expired`
              : undefined
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardBody>
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {data ? `${data.total.toLocaleString()} subscriptions` : "Subscriptions"}
          </CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No subscriptions"
              description="No plan subscriptions match this filter."
            />
          ) : (
            <div className="space-y-4">
              <Table>
                <THead>
                  <Th>User</Th>
                  <Th>Plan</Th>
                  <Th>Amount paid</Th>
                  <Th>Daily reward</Th>
                  <Th>Status</Th>
                  <Th>Started</Th>
                </THead>
                <tbody>
                  {data.items.map((s) => (
                    <Tr
                      key={s.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(s.id)}
                    >
                      <Td>
                        <p className="font-medium text-ink">
                          {s.userFirstName} {s.userLastName}
                        </p>
                        <p className="text-xs text-ink-faint">{s.userEmail}</p>
                      </Td>
                      <Td className="text-ink-dim">{s.planName}</Td>
                      <Td>
                        <Money value={s.amountPaid} size="sm" />
                      </Td>
                      <Td>
                        <Money value={s.dailyReward} size="sm" tone="secondary" />
                      </Td>
                      <Td>
                        <StatusPill status={s.status} />
                      </Td>
                      <Td className="text-ink-dim">
                        {formatDateTime(s.startsAt)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                onChange={setPage}
              />
            </div>
          )}
        </CardBody>
      </Card>

      <BottomSheet
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title="Subscription details"
      >
        {selectedLoading ? (
          <Skeleton className="h-48" />
        ) : selectedSub ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-base-surface2 px-4 py-3.5">
              <div>
                <p className="text-xs text-ink-faint">Amount paid</p>
                <Money value={selectedSub.amountPaid} size="lg" className="mt-0.5" />
              </div>
              <StatusPill status={selectedSub.status} />
            </div>
            <DetailList
              rows={[
                {
                  label: "User",
                  value: `${selectedSub.userFirstName} ${selectedSub.userLastName}`,
                  capitalize: false,
                },
                { label: "Email", value: selectedSub.userEmail, capitalize: false },
                { label: "Plan", value: selectedSub.planName },
                { label: "Daily task limit", value: selectedSub.dailyTaskLimit },
                { label: "Daily reward", value: formatMoney(selectedSub.dailyReward) },
                {
                  label: "Referral reward rate",
                  value: `${selectedSub.referralRewardRate}%`,
                },
                { label: "Started", value: formatDateTime(selectedSub.startsAt) },
                { label: "Created", value: formatDateTime(selectedSub.createdAt) },
                { label: "Updated", value: formatDateTime(selectedSub.updatedAt) },
              ]}
            />
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
