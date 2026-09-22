"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  Hash,
  Loader2,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiRequestError } from "@/lib/api-client";
import { depositsApi } from "@/lib/api/deposits";
import { useToast } from "@/components/ui/Toast";
import { cn, formatMoney } from "@/lib/utils";

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

// How long the dedicated account / USSD code stays valid for, mirrored from
// what Flutterwave itself quotes (their charge response includes an expiry,
// but we show a conservative countdown up front rather than waiting on it).
const CHARGE_WINDOW_SECONDS = 15 * 60;

// How often we ask the API whether the deposit has landed while the funding
// panel is open — the webhook usually beats this, but polling means the
// screen still resolves itself if a webhook is ever delayed.
const POLL_INTERVAL_MS = 5000;

type Step = "amount" | "method" | "fund" | "expired";
type Method = "bank_transfer" | "ussd";

interface ChargeDetails {
  method: Method;
  reference: string;
  amount: string;
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  ussdCode?: string;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (insecure context, permissions);
      // the value is still visible to select and copy manually.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-base-border bg-base-surface2 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          {label}
        </p>
        <p className="mt-0.5 truncate font-mono text-base font-semibold tabular text-ink">
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          copied
            ? "bg-primary-soft text-primary"
            : "border border-base-border text-ink-dim hover:border-primary-dim/50 hover:text-ink",
        )}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Countdown({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return (
    <span className="font-mono tabular">
      {m}:{s}
    </span>
  );
}

export function FundWalletModal({
  open,
  onClose,
  onFunded,
}: {
  open: boolean;
  onClose: () => void;
  onFunded: () => void;
}) {
  const { push } = useToast();
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [depositId, setDepositId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [charge, setCharge] = useState<ChargeDetails | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(CHARGE_WINDOW_SECONDS);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function reset() {
    setStep("amount");
    setAmount("");
    setDepositId(null);
    setError(null);
    setCharge(null);
    setSecondsLeft(CHARGE_WINDOW_SECONDS);
  }

  function stopTimers() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    pollRef.current = null;
    tickRef.current = null;
  }

  function handleClose() {
    stopTimers();
    // A deposit row already exists once we've reached the funding step —
    // leave it pending rather than silently cancelling, since the user may
    // still complete the transfer after closing this modal (they can check
    // its status from the deposit history list).
    reset();
    onClose();
  }

  async function createDeposit() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await depositsApi.create(amount, "flutterwave");
      setDepositId(result.deposit.id);
      setStep("method");
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not start deposit.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function chooseMethod(method: Method) {
    if (!depositId) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await depositsApi.charge(depositId, method);
      setCharge(result);
      setStep("fund");
      startWaiting(result.reference);
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not set up payment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startWaiting(reference: string) {
    setSecondsLeft(CHARGE_WINDOW_SECONDS);
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          handleExpiry(reference);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const payment = await depositsApi.verify(reference);
        // A 2xx response with no thrown error means Flutterwave confirmed
        // the payment and the wallet was credited server-side.
        if (payment) {
          stopTimers();
          push("success", "Payment confirmed and wallet updated.");
          onFunded();
          reset();
          onClose();
        }
      } catch {
        // Not confirmed yet — keep polling silently until the window
        // above runs out or the user closes the modal.
      }
    }, POLL_INTERVAL_MS);
  }

  // Fires when the on-screen countdown reaches zero. The server re-checks
  // with Flutterwave before failing the payment out (see
  // PaymentsService.expirePayment), so a transfer that lands right at the
  // wire still gets credited instead of lost to a race with the timer.
  async function handleExpiry(reference: string) {
    stopTimers();
    try {
      const result = await depositsApi.expire(reference);
      if (result && (result as { status?: string }).status === "successful") {
        push("success", "Payment confirmed and wallet updated.");
        onFunded();
        reset();
        onClose();
        return;
      }
    } catch {
      // Fall through to showing the expired screen regardless — the
      // deposit is no longer actionable from here either way.
    }
    setStep("expired");
    onFunded();
  }

  useEffect(() => stopTimers, []);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        step === "fund"
          ? "Complete your transfer"
          : step === "method"
            ? "Choose payment method"
            : step === "expired"
              ? "Payment window expired"
              : "Fund wallet"
      }
    >
      {step === "amount" && (
        <div className="space-y-4">
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
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button
            className="w-full"
            isLoading={submitting}
            disabled={!amount || Number(amount) <= 0}
            onClick={createDeposit}
          >
            Continue
          </Button>
        </div>
      )}

      {step === "method" && (
        <div className="space-y-3">
          <p className="text-sm text-ink-dim">
            Fund with {formatMoney(amount)} via:
          </p>
          <button
            type="button"
            disabled={submitting}
            onClick={() => chooseMethod("bank_transfer")}
            className="flex w-full items-center gap-3 rounded-xl border border-base-border bg-base-surface2 p-4 text-left transition-colors hover:border-primary-dim/50 disabled:opacity-60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Building2 className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">
                Bank Transfer
              </span>
              <span className="block text-xs text-ink-faint">
                Get a dedicated account number to transfer to
              </span>
            </span>
            {submitting && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-faint" />
            )}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => chooseMethod("ussd")}
            className="flex w-full items-center gap-3 rounded-xl border border-base-border bg-base-surface2 p-4 text-left transition-colors hover:border-primary-dim/50 disabled:opacity-60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Hash className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">
                USSD
              </span>
              <span className="block text-xs text-ink-faint">
                Dial a code from your phone to pay
              </span>
            </span>
            {submitting && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-faint" />
            )}
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}

      {step === "fund" && charge && (
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-2xl brand-gradient p-6 text-center text-white">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/80">
              {charge.method === "bank_transfer"
                ? "Transfer exactly"
                : "Pay exactly"}
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tabular">
              {formatMoney(charge.amount)}
            </p>
          </div>

          {charge.method === "bank_transfer" ? (
            <div className="space-y-2.5">
              <CopyField
                label="Account Number"
                value={charge.accountNumber ?? "—"}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-base-border bg-base-surface2 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    Bank
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                    {charge.bankName ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-base-border bg-base-surface2 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    Account Name
                  </p>
                  {/* Shown with the real registered name in brackets since
                      that's what the bank's own transfer confirmation will
                      display — matching it here avoids users second-guessing
                      the account when the names don't line up mid-transfer. */}
                  <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                    X2FACTOR (Henry Chijioke)
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <CopyField label="USSD Code" value={charge.ussdCode ?? "—"} />
          )}

          <div className="rounded-xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary">
            This account is yours for <Countdown seconds={secondsLeft} />.
            Your wallet is credited automatically once payment lands.
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-ink-dim">
            <Loader2 className="h-4 w-4 animate-spin" />
            Waiting for your transfer&hellip;
          </div>

          <Button
            variant="outline"
            className="w-full text-danger"
            onClick={handleClose}
          >
            <X className="h-4 w-4" /> Close
          </Button>
        </div>
      )}

      {step === "expired" && (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">
              This payment window has closed.
            </p>
            <p className="mt-1 text-sm text-ink-dim">
              The account details are no longer valid. No funds were taken —
              start a new deposit to try again.
            </p>
          </div>
          <div className="space-y-2.5">
            <Button
              className="w-full"
              onClick={() => {
                reset();
              }}
            >
              Start a new deposit
            </Button>
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
