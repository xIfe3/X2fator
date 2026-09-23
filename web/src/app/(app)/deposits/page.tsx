"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownToLine, Plus, Wallet } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { depositsApi } from "@/lib/api/deposits";
import type { Deposit } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DetailList } from "@/components/ui/DetailList";
import { Money } from "@/components/ui/Money";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { FundWalletModal } from "@/components/deposits/FundWalletModal";

export default function DepositsPage() {
  const {
    data: deposits,
    isLoading,
    refetch,
  } = useApiQuery(() => depositsApi.list());
  const [open, setOpen] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
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
      depositsApi
        .cancel(reference)
        .catch(() => undefined)
        .finally(() => {
          push("error", "Payment was cancelled.");
          refetch();
        });
      return;
    }

    verify(reference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDeposit(d)}
                  className="flex w-full flex-col gap-3 rounded-xl border border-base-border bg-base-raised p-4 text-left transition-colors hover:border-base-borderStrong sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Wallet className="h-4.5 w-4.5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium capitalize text-ink">
                        {d.provider} deposit
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">
                        {d.reference ?? d.id.slice(0, 8)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        {formatDateTime(d.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 border-t border-base-border pt-3 sm:flex-col sm:items-end sm:gap-1.5 sm:border-t-0 sm:pt-0">
                    <span className="font-mono text-sm font-semibold tabular text-ink">
                      {formatMoney(d.amount)}
                    </span>
                    <div className="flex items-center gap-2">
                      <StatusPill
                        status={
                          d.status === "failed" &&
                          d.failureReason === "Cancelled by user"
                            ? "cancelled"
                            : d.status
                        }
                      />
                      {(d.status === "pending" || d.status === "processing") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          isLoading={verifying === d.reference}
                          onClick={(e) => {
                            e.stopPropagation();
                            verify(d.reference);
                          }}
                        >
                          Check
                        </Button>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <FundWalletModal
        open={open}
        onClose={() => setOpen(false)}
        onFunded={refetch}
      />

      <BottomSheet
        open={!!selectedDeposit}
        onClose={() => setSelectedDeposit(null)}
        title="Deposit details"
      >
        {selectedDeposit && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-base-surface2 px-4 py-3.5">
              <div>
                <p className="text-xs text-ink-faint">Amount</p>
                <Money value={selectedDeposit.amount} size="lg" className="mt-0.5" />
              </div>
              <StatusPill
                status={
                  selectedDeposit.status === "failed" &&
                  selectedDeposit.failureReason === "Cancelled by user"
                    ? "cancelled"
                    : selectedDeposit.status
                }
              />
            </div>

            <DetailList
              rows={[
                { label: "Provider", value: selectedDeposit.provider },
                { label: "Currency", value: selectedDeposit.currency },
                { label: "Reference", value: selectedDeposit.reference },
                {
                  label: "Provider reference",
                  value: selectedDeposit.providerReference,
                },
                { label: "Created", value: formatDateTime(selectedDeposit.createdAt) },
                {
                  label: "Paid",
                  value: selectedDeposit.paidAt
                    ? formatDateTime(selectedDeposit.paidAt)
                    : undefined,
                },
              ]}
            />

            {selectedDeposit.status === "failed" &&
              selectedDeposit.failureReason &&
              selectedDeposit.failureReason !== "Cancelled by user" && (
                <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                  {selectedDeposit.failureReason}
                </div>
              )}

            {(selectedDeposit.status === "pending" ||
              selectedDeposit.status === "processing") && (
              <Button
                className="w-full"
                variant="secondary"
                isLoading={verifying === selectedDeposit.reference}
                onClick={() => verify(selectedDeposit.reference)}
              >
                Check status
              </Button>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
