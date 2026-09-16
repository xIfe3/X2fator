"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUpFromLine, CheckCircle2, Plus } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { withdrawalsApi } from "@/lib/api/withdrawals";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { Money } from "@/components/ui/Money";
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
  const { data: settings } = useApiQuery(() => withdrawalsApi.settings());
  const { data: banks, isLoading: banksLoading } = useApiQuery(() =>
    withdrawalsApi.banks(),
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    walletType: "task" as "task" | "referral",
    amount: "",
    bankCode: "",
    accountNumber: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const { push } = useToast();
  const verifyRequestId = useRef(0);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    setVerifiedName(null);
    setVerifyError(null);

    if (form.accountNumber.length < 10 || !form.bankCode) return;

    const requestId = ++verifyRequestId.current;
    setVerifying(true);
    const timeout = setTimeout(() => {
      withdrawalsApi
        .verifyAccount({
          accountNumber: form.accountNumber,
          bankCode: form.bankCode,
        })
        .then((res) => {
          if (verifyRequestId.current !== requestId) return;
          setVerifiedName(res.accountName);
        })
        .catch((err) => {
          if (verifyRequestId.current !== requestId) return;
          setVerifyError(
            err instanceof ApiRequestError
              ? err.message
              : "Could not verify this account.",
          );
        })
        .finally(() => {
          if (verifyRequestId.current === requestId) setVerifying(false);
        });
    }, 500);

    return () => clearTimeout(timeout);
  }, [form.accountNumber, form.bankCode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!verifiedName) {
      setError("Enter a valid bank and account number to verify first.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const bank = banks?.find((b) => b.code === form.bankCode);
      await withdrawalsApi.create({
        walletType: form.walletType,
        amount: form.amount,
        bankName: bank?.name ?? form.bankCode,
        bankCode: form.bankCode,
        accountNumber: form.accountNumber,
        accountName: verifiedName,
      });
      window.dispatchEvent(new Event("wallet-updated"));
      push("success", "Withdrawal request submitted for review.");
      setOpen(false);
      setForm({
        walletType: "task",
        amount: "",
        bankCode: "",
        accountNumber: "",
      });
      setVerifiedName(null);
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
            <div className="space-y-2.5">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-4 rounded-xl border border-base-border bg-base-raised p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <ArrowUpFromLine className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {w.bankName}{" "}
                      <span className="font-normal capitalize text-ink-faint">
                        · {w.walletType} wallet
                      </span>
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">
                      {w.accountNumber} · {w.accountName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      {formatDateTime(w.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Money value={w.amount} size="sm" />
                    <StatusPill status={w.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request withdrawal"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Select
            label="Withdraw from"
            value={form.walletType}
            onChange={(e) =>
              update("walletType", e.target.value as "task" | "referral")
            }
          >
            <option value="task">Task wallet</option>
            <option value="referral">Referral wallet</option>
          </Select>
          {form.walletType === "referral" ? (
            <p className="text-xs text-ink-faint">
              Referral wallet withdrawals are available anytime. Minimum:{" "}
              {settings
                ? formatMoney(settings.referralMinimumWithdrawal)
                : "…"}
              .
            </p>
          ) : (
            <p className="text-xs text-ink-faint">
              Task wallet withdrawals only open on day{" "}
              {settings?.taskWithdrawalDay ?? "…"} of each month.
            </p>
          )}
          <Input
            label="Amount (NGN)"
            type="number"
            min={1}
            step="0.01"
            required
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
          />
          <Select
            label="Bank"
            required
            disabled={banksLoading}
            value={form.bankCode}
            onChange={(e) => update("bankCode", e.target.value)}
          >
            <option value="">
              {banksLoading ? "Loading banks…" : "Select your bank"}
            </option>
            {banks?.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </Select>
          <Input
            label="Account number"
            required
            minLength={10}
            maxLength={20}
            value={form.accountNumber}
            onChange={(e) => update("accountNumber", e.target.value)}
          />
          {verifying && (
            <p className="text-xs text-ink-faint">Verifying account…</p>
          )}
          {verifiedName && (
            <p className="flex items-center gap-1.5 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" /> {verifiedName}
            </p>
          )}
          {verifyError && (
            <p className="text-sm text-danger">{verifyError}</p>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            isLoading={submitting}
            disabled={!verifiedName || verifying}
          >
            Submit request
          </Button>
        </form>
      </Modal>
    </div>
  );
}
