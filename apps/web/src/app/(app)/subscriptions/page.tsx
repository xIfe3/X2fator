"use client";

import { useState } from "react";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { subscriptionsApi } from "@/lib/api/plans";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

export default function SubscriptionsPage() {
  const { data: subs, isLoading, refetch } = useApiQuery(() => subscriptionsApi.list());
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { push } = useToast();

  async function cancel(id: string) {
    setCancellingId(id);
    try {
      await subscriptionsApi.cancel(id);
      push("success", "Subscription cancelled.");
      refetch();
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not cancel subscription.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Subscriptions</h1>
          <p className="mt-1 text-sm text-ink-dim">Plans you&apos;ve purchased.</p>
        </div>
        <Link href="/plans">
          <Button variant="secondary">Browse plans</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My subscriptions</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !subs || subs.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No subscriptions yet"
              description="Subscribe to a plan to start earning daily returns."
              action={
                <Link href="/plans">
                  <Button size="sm">Browse plans</Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <THead>
                <Th>Plan</Th>
                <Th>Started</Th>
                <Th>Ends</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </THead>
              <tbody>
                {subs.map((s) => (
                  <Tr key={s.id}>
                    <Td className="font-medium">{s.plan?.name ?? s.planId}</Td>
                    <Td className="text-ink-dim">{formatDate(s.startedAt)}</Td>
                    <Td className="text-ink-dim">{formatDate(s.endsAt)}</Td>
                    <Td>
                      <StatusPill status={s.status} />
                    </Td>
                    <Td className="text-right">
                      {s.status === "active" && (
                        <Button
                          size="sm"
                          variant="danger"
                          isLoading={cancellingId === s.id}
                          onClick={() => cancel(s.id)}
                        >
                          Cancel
                        </Button>
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
