"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  CHARGE_WINDOW_SECONDS,
  ChargeDetailsPanel,
  PaymentMethodPicker,
  POLL_INTERVAL_MS,
  type ChargeMethod,
} from "@/components/payments/ChargeViews";
import { ApiRequestError } from "@/lib/api-client";
import { depositsApi } from "@/lib/api/deposits";
import { useToast } from "@/components/ui/Toast";
import type { ChargeDetails } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

type Step = "amount" | "method" | "fund" | "expired";

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

  async function chooseMethod(method: ChargeMethod) {
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
          <PaymentMethodPicker submitting={submitting} onChoose={chooseMethod} />
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}

      {step === "fund" && charge && (
        <div className="space-y-5">
          <ChargeDetailsPanel
            charge={charge}
            secondsLeft={secondsLeft}
            successNote="Your wallet is credited automatically once payment lands."
          />

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
