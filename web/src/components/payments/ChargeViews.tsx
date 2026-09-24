"use client";

import { useState } from "react";
import { Building2, Check, Copy, Hash, Loader2 } from "lucide-react";
import type { ChargeDetails } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";

// Shared by the wallet-deposit modal and the signup page: both pay via
// Flutterwave's Charge API (bank transfer / USSD) and render the returned
// account number / USSD code in our own UI instead of redirecting to
// Flutterwave's hosted checkout.

// How long the dedicated account / USSD code stays valid for, mirrored from
// what Flutterwave itself quotes (their charge response includes an expiry,
// but we show a conservative countdown up front rather than waiting on it).
export const CHARGE_WINDOW_SECONDS = 15 * 60;

// How often we ask the API whether the payment has landed while the funding
// panel is open — the webhook usually beats this, but polling means the
// screen still resolves itself if a webhook is ever delayed.
export const POLL_INTERVAL_MS = 5000;

export type ChargeMethod = ChargeDetails["method"];

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

const METHODS: {
  method: ChargeMethod;
  label: string;
  hint: string;
  icon: typeof Building2;
}[] = [
  {
    method: "bank_transfer",
    label: "Bank Transfer",
    hint: "Get a dedicated account number to transfer to",
    icon: Building2,
  },
  {
    method: "ussd",
    label: "USSD",
    hint: "Dial a code from your phone to pay",
    icon: Hash,
  },
];

export function PaymentMethodPicker({
  submitting,
  onChoose,
}: {
  submitting: boolean;
  onChoose: (method: ChargeMethod) => void;
}) {
  return (
    <>
      {METHODS.map(({ method, label, hint, icon: Icon }) => (
        <button
          key={method}
          type="button"
          disabled={submitting}
          onClick={() => onChoose(method)}
          className="flex w-full items-center gap-3 rounded-xl border border-base-border bg-base-surface2 p-4 text-left transition-colors hover:border-primary-dim/50 disabled:opacity-60"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon className="h-4.5 w-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink">{label}</span>
            <span className="block text-xs text-ink-faint">{hint}</span>
          </span>
          {submitting && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-faint" />
          )}
        </button>
      ))}
    </>
  );
}

export function ChargeDetailsPanel({
  charge,
  secondsLeft,
  successNote,
}: {
  charge: ChargeDetails;
  secondsLeft: number;
  successNote: string;
}) {
  return (
    <>
      <div className="relative overflow-hidden rounded-2xl brand-gradient p-6 text-center text-white">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/80">
          {charge.method === "bank_transfer" ? "Transfer exactly" : "Pay exactly"}
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
              <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                X2 Factor
              </p>
            </div>
          </div>
        </div>
      ) : (
        <CopyField label="USSD Code" value={charge.ussdCode ?? "—"} />
      )}

      <div className="rounded-xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary">
        This account is yours for <Countdown seconds={secondsLeft} />.{" "}
        {successNote}
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-ink-dim">
        <Loader2 className="h-4 w-4 animate-spin" />
        Waiting for your transfer&hellip;
      </div>
    </>
  );
}
