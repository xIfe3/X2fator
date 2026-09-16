"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownToLine, Plus, Wallet } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { depositsApi } from "@/lib/api/deposits";
import type { DepositProvider } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

export default function DepositsPage() {
  const {
    data: deposits,
    isLoading,
    refetch,
  } = useApiQuery(() => depositsApi.list());
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState<DepositProvider>("mock");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const { push } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoVerifyRan = useRef(false);

  // Flutterwave redirects back here (via the register/callback bounce,
  // since both flows share one global callback URL) with tx_ref/status
  // query params. Auto-confirm instead of leaving the user to notice
  // their deposit is still pending and click "Check" themselves.
  useEffect(() => {
    if (autoVerifyRan.current) return;
    const reference = searchParams.get("tx_ref");
    if (!reference) return;
    autoVerifyRan.current = true;

    const status = searchParams.get("status");
    router.replace("/deposits");

    if (status === "cancelled") {
      push("error", "Payment was cancelled.");
      return;
    }

    verify(reference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await depositsApi.create(amount, provider);
      if (provider === "flutterwave") {
        const payment = await depositsApi.initializePayment(result.deposit.id);
        if (payment.authorizationUrl) {
          window.location.assign(payment.authorizationUrl);
          return;
        }
      }
      push("success", "Deposit created. Complete payment to fund your wallet.");
      setOpen(false);
      setAmount("");
      refetch();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not create deposit.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function verify(reference?: string) {
    if (!reference) return;
    setVerifying(reference);
    try {
      await depositsApi.verify(reference);
      push("success", "Payment confirmed and wallet updated.");
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError
          ? err.message
          : "Payment is not confirmed yet.",
      );
    } finally {
      setVerifying(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Deposits
          </h1>
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
              description="Fund your wallet to complete tasks and use platform services."
              action={
                <Button size="sm" onClick={() => setOpen(true)}>
                  Make your first deposit
                </Button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {deposits.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-4 rounded-xl border border-base-border bg-base-raised p-4 transition-colors hover:border-base-borderStrong"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Wallet className="h-4.5 w-4.5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium capitalize text-ink">
                      {d.provider} deposit
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[11px] text-ink-faint">
                      <span className="truncate">
                        {d.reference ?? d.id.slice(0, 8)}
                      </span>
                      <span>·</span>
                      <span className="whitespace-nowrap">
                        {formatDateTime(d.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="font-mono text-sm font-semibold tabular text-ink">
                      {formatMoney(d.amount)}
                    </span>
                    <div className="flex items-center gap-2">
                      <StatusPill status={d.status} />
                      {(d.status === "pending" || d.status === "processing") &&
                        d.provider !== "manual" &&
                        d.provider !== "mock" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            isLoading={verifying === d.reference}
                            onClick={() => verify(d.reference)}
                          >
                            Check
                          </Button>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
          <div className="flex flex-wrap gap-2">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  Number(amount) === preset
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-base-border text-ink-dim hover:border-primary-dim/50 hover:text-ink",
                )}
              >
                {formatMoney(preset)}
              </button>
            ))}
          </div>
          <Select
            label="Provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as DepositProvider)}
          >
            <option value="mock">Mock (instant, sandbox)</option>
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
