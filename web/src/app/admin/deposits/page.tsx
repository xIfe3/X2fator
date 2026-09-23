"use client";

import { useState } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useAuth } from "@/lib/auth-context";
import { adminApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { StatusPill } from "@/components/ui/StatusPill";
import { Money } from "@/components/ui/Money";
import { formatDateTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DetailList } from "@/components/ui/DetailList";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api-client";

export default function AdminDepositsPage() {
  const { hasPermission } = useAuth();
  const canReview = hasPermission("deposits.review");

  const {
    data: deposits,
    isLoading,
    refetch,
  } = useApiQuery(() => adminApi.deposits.all());
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useApiQuery(() => adminApi.deposits.stats());
  const { push } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: selectedDeposit, isLoading: selectedLoading } = useApiQuery(
    () => (selectedId ? adminApi.deposits.get(selectedId) : Promise.resolve(null)),
    [selectedId],
  );

  async function review(id: string, action: "approve" | "reject") {
    setBusyId(id + action);
    try {
      await adminApi.deposits.review(id, { action });
      push("success", action === "approve" ? "Deposit approved." : "Deposit rejected.");
      refetch();
      refetchStats();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError
          ? err.message
          : `Could not ${action} this deposit.`,
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Deposits
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Monitor incoming wallet funding across every provider.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsLoading
          ? [1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28" />)
          : [
              [
                "Total deposited",
                stats?.successfulAmount,
                stats?.successfulCount,
                "text-primary",
              ],
              [
                "Pending value",
                stats?.pendingAmount,
                stats?.pendingCount,
                "text-secondary",
              ],
              [
                "Failed / rejected",
                stats?.failedAmount,
                stats?.failedCount,
                "text-danger",
              ],
              [
                "All deposit volume",
                stats?.totalAmount,
                stats?.totalCount,
                "text-ink",
              ],
            ].map(([label, amount, count, tone]) => (
              <Card key={label}>
                <CardBody>
                  <p className="text-xs uppercase tracking-wider text-ink-faint">
                    {label}
                  </p>
                  <Money
                    value={amount as string | number | undefined}
                    size="lg"
                    className={`mt-2 block ${tone}`}
                  />
                  <p className="mt-1 text-xs text-ink-dim">
                    {count ?? 0} requests
                  </p>
                </CardBody>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deposit activity</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <p className="text-sm text-ink-dim">Loading deposits...</p>
          ) : (
            <Table>
              <THead>
                <Th>Reference</Th>
                <Th>User</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th className="text-right">Amount</Th>
                <Th />
              </THead>
              <tbody>
                {deposits?.map((deposit) => (
                  <Tr
                    key={deposit.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(deposit.id)}
                  >
                    <Td className="font-mono text-xs">{deposit.reference}</Td>
                    <Td className="text-xs">
                      <p className="font-medium text-ink">
                        {deposit.userFirstName} {deposit.userLastName}
                      </p>
                      <p className="text-ink-faint">{deposit.userEmail}</p>
                    </Td>
                    <Td className="text-ink-dim">
                      {formatDateTime(deposit.createdAt)}
                    </Td>
                    <Td>
                      <StatusPill status={deposit.status} />
                    </Td>
                    <Td className="text-right">
                      <Money value={deposit.amount} size="sm" />
                    </Td>
                    <Td className="text-right">
                      {deposit.status === "pending" && canReview && (
                        <span
                          className="flex justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            isLoading={busyId === deposit.id + "approve"}
                            onClick={() => review(deposit.id, "approve")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            isLoading={busyId === deposit.id + "reject"}
                            onClick={() => review(deposit.id, "reject")}
                          >
                            Reject
                          </Button>
                        </span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <BottomSheet
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title="Deposit details"
      >
        {selectedLoading ? (
          <Skeleton className="h-48" />
        ) : selectedDeposit ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-base-surface2 px-4 py-3.5">
              <div>
                <p className="text-xs text-ink-faint">Amount</p>
                <Money value={selectedDeposit.amount} size="lg" className="mt-0.5" />
              </div>
              <StatusPill status={selectedDeposit.status} />
            </div>
            <DetailList
              rows={[
                {
                  label: "User",
                  value: `${selectedDeposit.userFirstName} ${selectedDeposit.userLastName}`,
                  capitalize: false,
                },
                { label: "Email", value: selectedDeposit.userEmail, capitalize: false },
                { label: "Provider", value: selectedDeposit.provider },
                { label: "Currency", value: selectedDeposit.currency },
                { label: "Reference", value: selectedDeposit.reference },
                { label: "Provider reference", value: selectedDeposit.providerReference },
                { label: "Failure reason", value: selectedDeposit.failureReason },
                { label: "Created", value: formatDateTime(selectedDeposit.createdAt) },
                {
                  label: "Paid",
                  value: selectedDeposit.paidAt
                    ? formatDateTime(selectedDeposit.paidAt)
                    : undefined,
                },
              ]}
            />
            {selectedDeposit.payment && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  Linked payment
                </p>
                <DetailList
                  rows={[
                    { label: "Payment reference", value: selectedDeposit.payment.reference },
                    {
                      label: "Provider reference",
                      value: selectedDeposit.payment.providerReference,
                    },
                    { label: "Payment status", value: selectedDeposit.payment.status },
                  ]}
                />
              </>
            )}
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
