"use client";

import { FormEvent, useState } from "react";
import { Zap } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { utilitiesApi } from "@/lib/api/utilities";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default function UtilitiesPage() {
  const { data: purchases, isLoading, refetch } = useApiQuery(() => utilitiesApi.myPurchases());
  const [form, setForm] = useState({ type: "airtime", provider: "mtn", amount: "", recipient: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await utilitiesApi.purchase(form);
      push("success", "Purchase submitted.");
      setForm((f) => ({ ...f, amount: "", recipient: "" }));
      refetch();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not complete purchase.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Utilities</h1>
        <p className="mt-1 text-sm text-ink-dim">Buy airtime, data, and bills from your account wallet.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New purchase</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="airtime">Airtime</option>
              <option value="data">Data</option>
              <option value="electricity">Electricity</option>
              <option value="cable">Cable TV</option>
            </Select>
            <Input
              label="Provider"
              required
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
              placeholder="e.g. mtn, dstv, ikedc"
            />
            <Input
              label="Recipient (phone / meter / smartcard)"
              required
              value={form.recipient}
              onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))}
            />
            <Input
              label="Amount (NGN)"
              type="number"
              min={1}
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
            {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
            <Button type="submit" className="sm:col-span-2" isLoading={submitting}>
              Purchase
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !purchases || purchases.length === 0 ? (
            <EmptyState icon={Zap} title="No purchases yet" />
          ) : (
            <Table>
              <THead>
                <Th>Reference</Th>
                <Th>Type</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th className="text-right">Amount</Th>
              </THead>
              <tbody>
                {purchases.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-mono text-xs text-ink-dim">{p.reference}</Td>
                    <Td className="capitalize">{p.type ?? "—"}</Td>
                    <Td className="text-ink-dim">{formatDateTime(p.createdAt)}</Td>
                    <Td>
                      <StatusPill status={p.status} />
                    </Td>
                    <Td className="text-right font-mono tabular font-medium text-ink">{formatMoney(p.amount)}</Td>
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
