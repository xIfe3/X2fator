"use client";

import { useState } from "react";
import { Award, TrendingUp, Wallet2 } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { useAuth } from "@/lib/auth-context";
import { ApiRequestError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
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
  const [confirmAction, setConfirmAction] = useState<
    "cancel" | "reactivate" | null
  >(null);
  const [acting, setActing] = useState(false);
  const { hasPermission } = useAuth();
  const canManage = hasPermission("subscriptions.manage");
  const { push } = useToast();

  const { data: stats, refetch: refetchStats } = useApiQuery(() =>
    adminApi.subscriptions.stats(),
  );
  const { data, isLoading, refetch: refetchList } = useApiQuery(
    () =>
      adminApi.subscriptions.all({
        status: status || undefined,
        page,
        pageSize: 30,
      }),
    [status, page],
  );
  const {
    data: selectedSub,
    isLoading: selectedLoading,
    refetch: refetchSelected,
  } = useApiQuery(
    () => (selectedId ? adminApi.subscriptions.get(selectedId) : Promise.resolve(null)),
    [selectedId],
  );

  async function runAction() {
    if (!selectedId || !confirmAction) return;
    setActing(true);
    try {
      if (confirmAction === "cancel") {
        await adminApi.subscriptions.cancel(selectedId);
        push("success", "Subscription cancelled.");
      } else {
        await adminApi.subscriptions.reactivate(selectedId);
        push("success", "Subscription reactivated.");
      }
      setConfirmAction(null);
      refetchSelected();
      refetchList();
      refetchStats();
    } catch (error) {
      push(
        "error",
        error instanceof ApiRequestError
          ? error.message
          : "Could not update this subscription.",
      );
    } finally {
      setActing(false);
    }
  }

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
        onClose={() => {
          setSelectedId(null);
          setConfirmAction(null);
        }}
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
                  label: "Referral reward",
                  value: formatMoney(selectedSub.referralRewardAmount),
                },
                { label: "Started", value: formatDateTime(selectedSub.startsAt) },
                { label: "Created", value: formatDateTime(selectedSub.createdAt) },
                { label: "Updated", value: formatDateTime(selectedSub.updatedAt) },
              ]}
            />

            {canManage &&
              (selectedSub.status === "active" ||
                selectedSub.status === "cancelled" ||
                selectedSub.status === "expired") && (
                <div className="space-y-3 border-t border-base-border pt-4">
                  {confirmAction ? (
                    <>
                      <p className="text-sm text-ink-dim">
                        {confirmAction === "cancel"
                          ? `Cancel ${selectedSub.userEmail}'s ${selectedSub.planName} plan? They stop earning from it right away, and no refund is issued.`
                          : `Reactivate ${selectedSub.userEmail}'s ${selectedSub.planName} plan? They start earning from it again right away.`}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setConfirmAction(null)}
                          disabled={acting}
                        >
                          Back
                        </Button>
                        <Button
                          variant={confirmAction === "cancel" ? "danger" : "primary"}
                          className="flex-1"
                          isLoading={acting}
                          onClick={runAction}
                        >
                          {confirmAction === "cancel"
                            ? "Yes, cancel"
                            : "Yes, reactivate"}
                        </Button>
                      </div>
                    </>
                  ) : selectedSub.status === "active" ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setConfirmAction("cancel")}
                    >
                      Cancel subscription
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => setConfirmAction("reactivate")}
                    >
                      Reactivate subscription
                    </Button>
                  )}
                </div>
              )}
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
