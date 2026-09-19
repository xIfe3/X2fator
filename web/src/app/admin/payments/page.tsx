"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Select } from "@/components/ui/Input";
import { Money } from "@/components/ui/Money";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { formatDateTime } from "@/lib/utils";

const STATUSES = [
  "pending",
  "processing",
  "successful",
  "failed",
  "cancelled",
  "refunded",
];

function ConfigRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-base-border px-3.5 py-2.5">
      <span className="text-sm text-ink-dim">{label}</span>
      {ok ? (
        <Badge tone="secondary">
          <CheckCircle2 className="h-3 w-3" /> Configured
        </Badge>
      ) : (
        <Badge tone="danger">
          <XCircle className="h-3 w-3" /> Missing
        </Badge>
      )}
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data: gateway } = useApiQuery(() => adminApi.payments.gatewayStatus());
  const { data: stats } = useApiQuery(() => adminApi.payments.stats());
  const { data, isLoading } = useApiQuery(
    () =>
      adminApi.payments.all({
        provider: provider || undefined,
        status: status || undefined,
        page,
        pageSize: 30,
      }),
    [provider, status, page],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Payment gateway
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Flutterwave configuration status and every gateway transaction /
          webhook event.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Flutterwave
            configuration
          </CardTitle>
        </CardHeader>
        <CardBody>
          {!gateway ? (
            <PageSkeleton />
          ) : (
            <div className="space-y-3">
              {!gateway.fullyConfigured && (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-danger/40 bg-danger-soft p-3.5 text-sm text-danger">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Flutterwave isn't fully configured — deposits and
                  withdrawals may fail.
                </div>
              )}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <ConfigRow label="Secret key" ok={gateway.secretKeyConfigured} />
                <ConfigRow label="Public key" ok={gateway.publicKeyConfigured} />
                <ConfigRow
                  label="Webhook secret hash"
                  ok={gateway.webhookSecretConfigured}
                />
                <ConfigRow
                  label="Callback URL"
                  ok={!!gateway.callbackUrl}
                />
              </div>
              <p className="text-xs text-ink-faint">
                API base: {gateway.baseUrl}
                {gateway.callbackUrl ? ` · Callback: ${gateway.callbackUrl}` : ""}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Successful volume"
          value={
            stats ? `₦${Number(stats.successfulVolume).toLocaleString()}` : "—"
          }
          icon={TrendingUp}
          sub={stats ? `${stats.counts.successful.toLocaleString()} successful` : undefined}
        />
        <StatCard
          label="Pending / processing"
          value={
            stats
              ? (stats.counts.pending + stats.counts.processing).toLocaleString()
              : "—"
          }
          icon={CreditCard}
          tone="secondary"
        />
        <StatCard
          label="Failed / cancelled"
          value={
            stats
              ? (stats.counts.failed + stats.counts.cancelled).toLocaleString()
              : "—"
          }
          icon={XCircle}
          sub={stats ? `${stats.counts.refunded} refunded` : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Provider"
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All providers</option>
            <option value="flutterwave">Flutterwave</option>
            <option value="manual">Manual</option>
            <option value="mock">Mock</option>
          </Select>
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
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
            {data ? `${data.total.toLocaleString()} transactions` : "Transactions"}
          </CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No transactions"
              description="No gateway transactions match this filter."
            />
          ) : (
            <div className="space-y-4">
              <Table>
                <THead>
                  <Th>User</Th>
                  <Th>Provider</Th>
                  <Th>Reference</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                </THead>
                <tbody>
                  {data.items.map((p) => (
                    <Tr key={p.id}>
                      <Td>
                        <p className="font-medium text-ink">
                          {p.userFirstName} {p.userLastName}
                        </p>
                        <p className="text-xs text-ink-faint">{p.userEmail}</p>
                      </Td>
                      <Td className="capitalize text-ink-dim">{p.provider}</Td>
                      <Td className="text-xs">
                        <Link
                          href={`/admin/payments/${p.id}`}
                          className="font-mono text-primary hover:underline"
                        >
                          {p.reference}
                        </Link>
                        {p.providerReference && (
                          <p className="text-ink-faint">{p.providerReference}</p>
                        )}
                      </Td>
                      <Td>
                        <Money value={p.amount} size="sm" />
                      </Td>
                      <Td>
                        <StatusPill status={p.status} />
                      </Td>
                      <Td className="text-ink-dim">
                        {formatDateTime(p.createdAt)}
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
    </div>
  );
}
