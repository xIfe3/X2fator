"use client";

import { FormEvent, useState } from "react";
import { ArrowUpFromLine, Plus } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { withdrawalsApi } from "@/lib/api/withdrawals";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default function WithdrawalsPage() {
  const {
    data: withdrawals,
    isLoading,
    refetch,
  } = useApiQuery(() => withdrawalsApi.list());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await withdrawalsApi.create(form);
      window.dispatchEvent(new Event("wallet-updated"));
      push("success", "Withdrawal request submitted for review.");
      setOpen(false);
      setForm({ amount: "", bankName: "", accountNumber: "", accountName: "" });
      refetch();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not submit withdrawal.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Withdrawals
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            Move earnings out to your bank account.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Request withdrawal
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !withdrawals || withdrawals.length === 0 ? (
            <EmptyState
              icon={ArrowUpFromLine}
              title="No withdrawals yet"
              description="Requests are reviewed by an admin before payout."
            />
          ) : (
            <Table>
              <THead>
                <Th>Bank</Th>
                <Th>Account</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th className="text-right">Amount</Th>
              </THead>
              <tbody>
                {withdrawals.map((w) => (
                  <Tr key={w.id}>
                    <Td>{w.bankName}</Td>
                    <Td className="font-mono text-xs text-ink-dim">
                      {w.accountNumber} · {w.accountName}
                    </Td>
                    <Td className="text-ink-dim">
                      {formatDateTime(w.createdAt)}
                    </Td>
                    <Td>
                      <StatusPill status={w.status} />
                    </Td>
                    <Td className="text-right font-mono tabular font-medium text-ink">
                      {formatMoney(w.amount)}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request withdrawal"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Amount (NGN)"
            type="number"
            min={1}
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
          />
          <Input
            label="Bank name"
            required
            value={form.bankName}
            onChange={(e) => update("bankName", e.target.value)}
            placeholder="e.g. GTBank"
          />
          <Input
            label="Account number"
            required
            minLength={10}
            maxLength={20}
            value={form.accountNumber}
            onChange={(e) => update("accountNumber", e.target.value)}
          />
          <Input
            label="Account name"
            required
            value={form.accountName}
            onChange={(e) => update("accountName", e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" isLoading={submitting}>
            Submit request
          </Button>
        </form>
      </Modal>
    </div>
  );
}
