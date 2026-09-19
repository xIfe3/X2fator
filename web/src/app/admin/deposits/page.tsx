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
                  <Tr key={deposit.id}>
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
                        <span className="flex justify-end gap-2">
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
    </div>
  );
}
