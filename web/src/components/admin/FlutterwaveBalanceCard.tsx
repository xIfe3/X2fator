"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { adminApi, type FlutterwaveBalance } from "@/lib/api/admin";
import { ApiRequestError } from "@/lib/api-client";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatMoney } from "@/lib/utils";

const REVEAL_SECONDS = 10;

/**
 * Shows the live Flutterwave NGN balance only after the admin re-enters
 * their password, then hides it again after REVEAL_SECONDS (or as soon
 * as the tab is hidden). The balance is never kept once hidden.
 */
export function FlutterwaveBalanceCard() {
  const [balance, setBalance] = useState<FlutterwaveBalance | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [promptOpen, setPromptOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function hide() {
    setBalance(null);
    setSecondsLeft(0);
  }

  useEffect(() => {
    if (!balance) return;
    if (secondsLeft <= 0) {
      hide();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [balance, secondsLeft]);

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) hide();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  function closePrompt() {
    setPromptOpen(false);
    setPassword("");
    setError(null);
  }

  async function onReveal(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await adminApi.flutterwave.revealBalance(password);
      closePrompt();
      setBalance(result);
      setSecondsLeft(REVEAL_SECONDS);
    } catch (err) {
      setPassword("");
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not fetch the Flutterwave balance.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-faint">
                <Lock className="h-3.5 w-3.5" /> Flutterwave balance (NGN)
              </p>
              <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-ink">
                {balance ? formatMoney(balance.availableBalance) : "₦ ••••••••"}
              </p>
              <p className="mt-1 text-xs text-ink-faint">
                {balance
                  ? `Ledger ${formatMoney(balance.ledgerBalance)} · hides in ${secondsLeft}s`
                  : "Pays for withdrawals and airtime/data. Password required to view."}
              </p>
            </div>
            {balance ? (
              <Button variant="outline" onClick={hide}>
                <EyeOff className="h-4 w-4" /> Hide
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setPromptOpen(true)}>
                <Eye className="h-4 w-4" /> Reveal
              </Button>
            )}
          </div>
          {balance && (
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-base-surface2">
              <div
                className="h-full bg-primary transition-[width] duration-1000 ease-linear"
                style={{ width: `${(secondsLeft / REVEAL_SECONDS) * 100}%` }}
              />
            </div>
          )}
        </CardBody>
      </Card>

      <Modal open={promptOpen} onClose={closePrompt} title="Confirm it's you">
        <form onSubmit={onReveal} className="space-y-4">
          <p className="text-sm text-ink-dim">
            Enter your admin password to view the Flutterwave balance. It will
            hide again after {REVEAL_SECONDS} seconds.
          </p>
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" isLoading={submitting}>
            Reveal balance
          </Button>
        </form>
      </Modal>
    </>
  );
}
