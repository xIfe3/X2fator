"use client";

import { FormEvent, useState } from "react";
import { ArrowDownToLine, Plus } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { depositsApi } from "@/lib/api/deposits";
import type { DepositProvider } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default function DepositsPage() {
  const { data: deposits, isLoading, refetch } = useApiQuery(() => depositsApi.list());
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState<DepositProvider>("mock");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await depositsApi.create(amount, provider);
      push("success", "Deposit created. Complete payment to fund your wallet.");
      setOpen(false);
      setAmount("");
      refetch();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create deposit.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Deposits</h1>
          <p className="mt-1 text-sm text-ink-dim">Fund your account wallet.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New deposit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !deposits || deposits.length === 0 ? (
            <EmptyState
              icon={ArrowDownToLine}
              title="No deposits yet"
              description="Fund your wallet to subscribe to plans and unlock tasks."
              action={
                <Button size="sm" onClick={() => setOpen(true)}>
                  Make your first deposit
                </Button>
              }
            />
          ) : (
            <Table>
              <THead>
                <Th>Reference</Th>
                <Th>Provider</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th className="text-right">Amount</Th>
              </THead>
              <tbody>
                {deposits.map((d) => (
                  <Tr key={d.id}>
                    <Td className="font-mono text-xs text-ink-dim">{d.reference ?? d.id.slice(0, 8)}</Td>
                    <Td className="capitalize">{d.provider}</Td>
                    <Td className="text-ink-dim">{formatDateTime(d.createdAt)}</Td>
                    <Td>
                      <StatusPill status={d.status} />
                    </Td>
                    <Td className="text-right font-mono tabular font-medium text-ink">{formatMoney(d.amount)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New deposit">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Amount (NGN)"
            type="number"
            min={1}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5000"
          />
          <Select label="Provider" value={provider} onChange={(e) => setProvider(e.target.value as DepositProvider)}>
            <option value="mock">Mock (instant, sandbox)</option>
            <option value="paystack">Paystack</option>
            <option value="flutterwave">Flutterwave</option>
            <option value="manual">Manual bank transfer</option>
          </Select>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" isLoading={submitting}>
            Continue
          </Button>
        </form>
      </Modal>
    </div>
  );
}
