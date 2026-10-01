"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowUpFromLine,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  KeyRound,
  Landmark,
  Lock,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { withdrawalsApi, type SavedBankAccount } from "@/lib/api/withdrawals";
import { walletApi } from "@/lib/api/wallet";
import type { Withdrawal } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DetailList } from "@/components/ui/DetailList";
import { Input } from "@/components/ui/Input";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { StatusPill } from "@/components/ui/StatusPill";
import { Money } from "@/components/ui/Money";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";

type WalletType = "task" | "referral";

const WALLET_LABEL: Record<WalletType, { title: string; subtitle: string }> = {
  referral: { title: "Referral", subtitle: "Sales / referral earnings" },
  task: { title: "Task", subtitle: "Activity / task earnings" },
};

function ordinal(n: number) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/** Next date (today included) the task wallet opens for withdrawal. */
function nextTaskWithdrawalDate(day: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
  return thisMonth >= today
    ? thisMonth
    : new Date(now.getFullYear(), now.getMonth() + 1, day);
}

function maskAccount(accountNumber: string) {
  return `····${accountNumber.slice(-4)}`;
}

export default function WithdrawalsPage() {
  const {
    data: withdrawals,
    isLoading,
    refetch,
  } = useApiQuery(() => withdrawalsApi.list());
  const { data: settings } = useApiQuery(() => withdrawalsApi.settings());
  const { data: taskMinimum } = useApiQuery(() => withdrawalsApi.taskMinimum());
  const { data: balance, refetch: refetchBalance } = useApiQuery(() =>
    walletApi.getBalance(),
  );
  const [tipOpen, setTipOpen] = useState(false);

  useEffect(() => {
    window.addEventListener("wallet-updated", refetchBalance);
    return () => window.removeEventListener("wallet-updated", refetchBalance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const {
    data: accounts,
    refetch: refetchAccounts,
  } = useApiQuery(() => withdrawalsApi.listAccounts());
  const { data: pinStatus, refetch: refetchPinStatus } = useApiQuery(() =>
    withdrawalsApi.pinStatus(),
  );

  const [open, setOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [resetPinOpen, setResetPinOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [walletType, setWalletType] = useState<WalletType>("referral");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(
    null,
  );

  const [form, setForm] = useState({ amount: "", pin: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (!accounts || accounts.length === 0) {
      setSelectedAccountId(null);
      return;
    }
    if (selectedAccountId && accounts.some((a) => a.id === selectedAccountId)) {
      return;
    }
    setSelectedAccountId(accounts.find((a) => a.isDefault)?.id ?? accounts[0]!.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  const selectedAccount = accounts?.find((a) => a.id === selectedAccountId);

  function openWithdrawModal() {
    if (!pinStatus?.isSet) {
      setPinModalOpen(true);
      return;
    }
    if (!accounts || accounts.length === 0) {
      setManageOpen(true);
      return;
    }
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!selectedAccount) {
      setError("Select an account to withdraw to.");
      return;
    }
    if (form.pin.length !== 4) {
      setError("Enter your 4-digit withdrawal PIN.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await withdrawalsApi.create({
        walletType,
        amount: form.amount,
        bankName: selectedAccount.bankName,
        bankCode: selectedAccount.bankCode,
        accountNumber: selectedAccount.accountNumber,
        accountName: selectedAccount.accountName,
        pin: form.pin,
      });
      window.dispatchEvent(new Event("wallet-updated"));
      push("success", "Withdrawal submitted — payout is being processed.");
      setOpen(false);
      setForm({ amount: "", pin: "" });
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
        <div className="flex flex-wrap gap-2">
          {pinStatus?.isSet && (
            <Button variant="outline" onClick={() => setResetPinOpen(true)}>
              <KeyRound className="h-4 w-4" /> Reset PIN
            </Button>
          )}
          <Button variant="outline" onClick={() => setManageOpen(true)}>
            <Settings2 className="h-4 w-4" /> Manage accounts
          </Button>
          <Button onClick={openWithdrawModal}>
            <Plus className="h-4 w-4" /> Request withdrawal
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Your balances</CardTitle>
            <button
              type="button"
              onClick={() => setTipOpen((v) => !v)}
              aria-expanded={tipOpen}
              aria-label="Withdrawal rules"
              className={cn(
                "rounded-full p-0.5 transition-colors",
                tipOpen ? "text-primary" : "text-ink-faint hover:text-ink",
              )}
            >
              <CircleHelp className="h-4.5 w-4.5" />
            </button>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {tipOpen && (
            <div className="rounded-xl border border-primary-dim/30 bg-primary-soft px-4 py-3 text-xs text-ink">
              <p className="mb-1.5 font-semibold text-primary">
                How withdrawals work
              </p>
              <ul className="list-disc space-y-1 pl-4 text-ink-dim">
                <li>
                  <span className="font-medium text-ink">Referral wallet:</span>{" "}
                  withdraw anytime. The minimum withdrawal is{" "}
                  <span className="font-medium text-ink">
                    {settings
                      ? formatMoney(settings.referralMinimumWithdrawal)
                      : "…"}
                  </span>
                  .
                </li>
                <li>
                  <span className="font-medium text-ink">Task wallet:</span>{" "}
                  withdrawals open once a month, on the{" "}
                  <span className="font-medium text-ink">
                    {settings ? ordinal(settings.taskWithdrawalDay) : "…"}
                  </span>{" "}
                  of every month. The minimum withdrawal is{" "}
                  <span className="font-medium text-ink">
                    {taskMinimum
                      ? formatMoney(taskMinimum.minimum)
                      : "…"}
                  </span>
                  .
                  {settings && (
                    <>
                      {" "}
                      Next opening:{" "}
                      <span className="font-medium text-ink">
                        {nextTaskWithdrawalDate(
                          settings.taskWithdrawalDay,
                        ).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      .
                    </>
                  )}
                </li>
                {settings && (
                  <li>
                    <span className="font-medium text-ink">Fee:</span>{" "}
                    {formatMoney(settings.withdrawalFeeFlat)}
                    {Number(settings.withdrawalFeePercent) > 0 &&
                      ` + ${Number(settings.withdrawalFeePercent)}%`}{" "}
                    per withdrawal, deducted from the amount you withdraw.
                  </li>
                )}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {(["referral", "task"] as WalletType[]).map((type) => (
              <div
                key={type}
                className="rounded-xl border border-base-border bg-base-raised p-4"
              >
                <p className="text-xs font-medium text-ink-dim">
                  {WALLET_LABEL[type].title} wallet
                </p>
                <Money
                  value={balance?.[type] ?? "0"}
                  size="lg"
                  className="mt-1"
                />
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  {!settings
                    ? "…"
                    : type === "referral"
                      ? `Withdraw anytime · min ${formatMoney(settings.referralMinimumWithdrawal)}`
                      : `Opens on the ${ordinal(settings.taskWithdrawalDay)} of each month${taskMinimum ? ` · min ${formatMoney(taskMinimum.minimum)}` : ""}`}
                </p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

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
              description="Payouts are sent to your bank automatically once submitted."
            />
          ) : (
            <div className="space-y-2.5">
              {withdrawals.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWithdrawal(w)}
                  className="flex w-full items-center gap-4 rounded-xl border border-base-border bg-base-raised p-4 text-left transition-colors hover:border-base-borderStrong"
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
                      {maskAccount(w.accountNumber)} · {w.accountName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      {formatDateTime(w.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Money value={w.amount} size="sm" />
                    <StatusPill status={w.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Set withdrawal PIN */}
      <Modal
        open={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        title="Set your withdrawal PIN"
      >
        <SetPinForm
          onDone={() => {
            setPinModalOpen(false);
            refetchPinStatus();
            if (!accounts || accounts.length === 0) {
              setManageOpen(true);
            } else {
              setOpen(true);
            }
          }}
        />
      </Modal>

      {/* Reset withdrawal PIN */}
      <Modal
        open={resetPinOpen}
        onClose={() => setResetPinOpen(false)}
        title="Reset your withdrawal PIN"
      >
        <ResetPinForm
          onDone={() => {
            setResetPinOpen(false);
            refetchPinStatus();
            push(
              "success",
              "Withdrawal PIN changed. We've sent a confirmation to your email.",
            );
          }}
        />
      </Modal>

      {/* Manage saved accounts */}
      <Modal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Manage payout accounts"
      >
        <ManageAccounts
          accounts={accounts ?? []}
          onChanged={refetchAccounts}
        />
      </Modal>

      {/* Request withdrawal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request withdrawal"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">
              Which wallet are you withdrawing from?
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {(Object.keys(WALLET_LABEL) as WalletType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setWalletType(type)}
                  className={cn(
                    "rounded-xl border p-3.5 text-left transition-colors",
                    walletType === type
                      ? "border-primary bg-primary-soft"
                      : "border-base-border bg-base-raised hover:bg-base-surface2",
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      walletType === type ? "text-primary" : "text-ink",
                    )}
                  >
                    {WALLET_LABEL[type].title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">
                    {WALLET_LABEL[type].subtitle}
                  </p>
                  <p className="mt-2 text-sm font-medium text-ink">
                    {balance ? formatMoney(balance[type]) : "…"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {walletType === "referral" ? (
            <p className="text-xs text-ink-faint">
              Referral wallet withdrawals are available anytime. Minimum:{" "}
              {settings
                ? formatMoney(settings.referralMinimumWithdrawal)
                : "…"}
              .
            </p>
          ) : (
            <p className="text-xs text-ink-faint">
              Task wallet withdrawals only open on the{" "}
              {settings ? ordinal(settings.taskWithdrawalDay) : "…"} of each
              month. Minimum:{" "}
              {taskMinimum ? formatMoney(taskMinimum.minimum) : "…"}.
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

          {settings && Number(form.amount) > 0 && (() => {
            const amount = Number(form.amount);
            const fee =
              Math.round(
                (Number(settings.withdrawalFeeFlat) +
                  (amount * Number(settings.withdrawalFeePercent)) / 100) *
                  100,
              ) / 100;
            const net = amount - fee;
            return (
              <div className="space-y-1 rounded-xl bg-base-surface2 px-4 py-3 text-xs">
                <div className="flex justify-between text-ink-dim">
                  <span>Withdrawal fee</span>
                  <span>{formatMoney(fee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-ink">
                  <span>You will receive</span>
                  <span className={net <= 0 ? "text-danger" : undefined}>
                    {formatMoney(Math.max(net, 0))}
                  </span>
                </div>
              </div>
            );
          })()}

          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">
              Payout account
            </span>
            {!accounts || accounts.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setManageOpen(true);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-base-border p-3.5 text-left text-sm text-ink-dim hover:border-primary-dim/50 hover:text-ink"
              >
                Add a payout account <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedAccountId(account.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                      selectedAccountId === account.id
                        ? "border-primary bg-primary-soft"
                        : "border-base-border bg-base-raised hover:bg-base-surface2",
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-base-surface2 text-primary">
                      <Landmark className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                        {account.bankName}
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                      </p>
                      <p className="truncate font-mono text-[11px] text-ink-faint">
                        {maskAccount(account.accountNumber)} ·{" "}
                        {account.accountName}
                      </p>
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setManageOpen(true);
                  }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Add another account
                </button>
              </div>
            )}
          </div>

          <Input
            label="Withdrawal PIN"
            type="password"
            inputMode="numeric"
            required
            maxLength={4}
            value={form.pin}
            onChange={(e) =>
              update("pin", e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            rightElement={<Lock className="h-4 w-4 text-ink-faint" />}
          />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setResetPinOpen(true);
            }}
            className="-mt-2 text-xs font-medium text-primary hover:underline"
          >
            Forgot PIN?
          </button>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            isLoading={submitting}
            disabled={!selectedAccount || form.pin.length !== 4}
          >
            Submit request
          </Button>
        </form>
      </Modal>

      {/* Withdrawal detail */}
      <BottomSheet
        open={!!selectedWithdrawal}
        onClose={() => setSelectedWithdrawal(null)}
        title="Withdrawal details"
      >
        {selectedWithdrawal && (
          <WithdrawalDetail withdrawal={selectedWithdrawal} />
        )}
      </BottomSheet>
    </div>
  );
}

function WithdrawalDetail({ withdrawal: w }: { withdrawal: Withdrawal }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-base-surface2 px-4 py-3.5">
        <div>
          <p className="text-xs text-ink-faint">Amount</p>
          <Money value={w.amount} size="lg" className="mt-0.5" />
        </div>
        <StatusPill status={w.status} />
      </div>

      <DetailList
        rows={[
          { label: "Amount requested", value: formatMoney(w.amount) },
          { label: "Fee", value: w.fee ? formatMoney(w.fee) : undefined },
          {
            label: "Amount paid out",
            value: w.netAmount ? formatMoney(w.netAmount) : undefined,
          },
          { label: "Wallet", value: `${w.walletType} wallet` },
          { label: "Bank", value: w.bankName },
          { label: "Account number", value: maskAccount(w.accountNumber) },
          { label: "Account name", value: w.accountName },
          { label: "Reference", value: w.transactionReference },
          { label: "Requested", value: formatDateTime(w.createdAt) },
          {
            label: "Processed",
            value: w.processedAt ? formatDateTime(w.processedAt) : undefined,
          },
        ]}
      />

      {w.status === "rejected" && w.rejectionReason && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {w.rejectionReason}
        </div>
      )}
    </div>
  );
}

function SetPinForm({ onDone }: { onDone: () => void }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) {
      setError("PIN must be exactly 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await withdrawalsApi.setPin(pin);
      onDone();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Could not set PIN.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-ink-dim">
        You need a withdrawal PIN before you can request a withdrawal. You'll
        use this PIN to authorize every withdrawal.
      </p>
      <Input
        label="Choose a 4-digit PIN"
        type="password"
        inputMode="numeric"
        required
        maxLength={4}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
      />
      <Input
        label="Confirm PIN"
        type="password"
        inputMode="numeric"
        required
        maxLength={4}
        value={confirmPin}
        onChange={(e) =>
          setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
        }
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        type="submit"
        className="w-full"
        isLoading={submitting}
        disabled={pin.length !== 4 || confirmPin.length !== 4}
      >
        Set PIN
      </Button>
    </form>
  );
}

function ResetPinForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) {
      setError("PIN must be exactly 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await withdrawalsApi.resetPin({ password, newPin: pin });
      onDone();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Could not reset PIN.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-ink-dim">
        Enter your account password to choose a new withdrawal PIN. We'll email
        you to confirm the change.
      </p>
      <Input
        label="Account password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        label="New 4-digit PIN"
        type="password"
        inputMode="numeric"
        required
        maxLength={4}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
      />
      <Input
        label="Confirm new PIN"
        type="password"
        inputMode="numeric"
        required
        maxLength={4}
        value={confirmPin}
        onChange={(e) =>
          setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
        }
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        type="submit"
        className="w-full"
        isLoading={submitting}
        disabled={!password || pin.length !== 4 || confirmPin.length !== 4}
      >
        Change PIN
      </Button>
    </form>
  );
}

function ManageAccounts({
  accounts,
  onChanged,
}: {
  accounts: SavedBankAccount[];
  onChanged: () => void;
}) {
  const { data: banks, isLoading: banksLoading } = useApiQuery(() =>
    withdrawalsApi.banks(),
  );
  const [adding, setAdding] = useState(accounts.length === 0);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { push } = useToast();
  const verifyRequestId = useRef(0);

  useEffect(() => {
    setVerifiedName(null);
    setVerifyError(null);

    if (accountNumber.length < 10 || !bankCode) return;

    const requestId = ++verifyRequestId.current;
    setVerifying(true);
    const timeout = setTimeout(() => {
      withdrawalsApi
        .verifyAccount({ accountNumber, bankCode })
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
  }, [accountNumber, bankCode]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!verifiedName) {
      setError("Enter a valid bank and account number to verify first.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const bankName = banks?.find((b) => b.code === bankCode)?.name ?? bankCode;
      await withdrawalsApi.addAccount({ accountNumber, bankCode, bankName });
      push("success", "Account added.");
      setBankCode("");
      setAccountNumber("");
      setVerifiedName(null);
      setAdding(false);
      onChanged();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Could not add account.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      await withdrawalsApi.deleteAccount(id);
      push("success", "Account removed.");
      onChanged();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError
          ? err.message
          : "Could not remove account.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {accounts.length > 0 && (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center gap-3 rounded-xl border border-base-border bg-base-raised p-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Landmark className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                  {account.bankName}
                  {account.isDefault && (
                    <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      Default
                    </span>
                  )}
                </p>
                <p className="truncate font-mono text-[11px] text-ink-faint">
                  {maskAccount(account.accountNumber)} · {account.accountName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(account.id)}
                disabled={deletingId === account.id}
                aria-label="Remove account"
                className="shrink-0 rounded-lg p-2 text-ink-faint hover:bg-danger-soft hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <form onSubmit={onAdd} className="space-y-4 border-t border-base-border pt-4">
          <SearchSelect
            label="Bank"
            required
            disabled={banksLoading}
            placeholder={banksLoading ? "Loading banks…" : "Select your bank"}
            searchPlaceholder="Search banks…"
            value={bankCode}
            onChange={setBankCode}
            options={
              banks?.map((bank) => ({ value: bank.code, label: bank.name })) ?? []
            }
          />
          <Input
            label="Account number"
            required
            minLength={10}
            maxLength={20}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
          {verifying && (
            <p className="text-xs text-ink-faint">Verifying account…</p>
          )}
          {verifiedName && !verifying && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3.5 py-2.5 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> {verifiedName}
            </div>
          )}
          {verifyError && !verifying && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
              <XCircle className="h-4 w-4 shrink-0" /> {verifyError}
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            {accounts.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              isLoading={submitting}
              disabled={!verifiedName || verifying}
            >
              Save account
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-4 w-4" /> Add another account
        </Button>
      )}
    </div>
  );
}
