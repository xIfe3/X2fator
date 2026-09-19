"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/utils";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-base-border py-2.5 text-sm last:border-0">
      <span className="text-ink-faint">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

export default function AdminPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: payment, isLoading } = useApiQuery(
    () => adminApi.payments.get(params.id),
    [params.id],
  );

  let prettyResponse = payment?.rawResponse ?? null;
  if (prettyResponse) {
    try {
      prettyResponse = JSON.stringify(JSON.parse(prettyResponse), null, 2);
    } catch {
      // not JSON — show as-is
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-ink-dim hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {isLoading || !payment ? (
        <PageSkeleton />
      ) : (
        <>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">
              Payment {payment.reference}
            </h1>
            <p className="mt-1 text-sm text-ink-dim">
              {payment.userFirstName} {payment.userLastName} · {payment.userEmail}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody>
              <DetailRow label="Provider" value={payment.provider} />
              <DetailRow
                label="Amount"
                value={<Money value={payment.amount} size="sm" />}
              />
              <DetailRow
                label="Status"
                value={<StatusPill status={payment.status} />}
              />
              <DetailRow label="Reference" value={payment.reference} />
              <DetailRow
                label="Provider reference"
                value={payment.providerReference ?? "—"}
              />
              <DetailRow label="Created" value={formatDateTime(payment.createdAt)} />
              <DetailRow label="Updated" value={formatDateTime(payment.updatedAt)} />
            </CardBody>
          </Card>

          {payment.metadata && (
            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardBody>
                <pre className="overflow-x-auto rounded-xl bg-base-surface2 p-4 text-xs text-ink-dim">
                  {JSON.stringify(payment.metadata, null, 2)}
                </pre>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Raw provider response</CardTitle>
            </CardHeader>
            <CardBody>
              {prettyResponse ? (
                <pre className="overflow-x-auto rounded-xl bg-base-surface2 p-4 text-xs text-ink-dim">
                  {prettyResponse}
                </pre>
              ) : (
                <p className="text-sm text-ink-faint">
                  No provider response captured for this payment yet.
                </p>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
