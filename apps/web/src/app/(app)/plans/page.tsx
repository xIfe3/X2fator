"use client";

import { useState } from "react";
import { Check, LineChart, Star } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { plansApi, subscriptionsApi } from "@/lib/api/plans";
import type { Plan } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/utils";

export default function PlansPage() {
  const { data: plans, isLoading } = useApiQuery(() => plansApi.listActive());
  const [selected, setSelected] = useState<Plan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  async function subscribe() {
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    try {
      await subscriptionsApi.purchase(selected.id);
      push("success", `Subscribed to ${selected.name}.`);
      setSelected(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not subscribe to this plan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Plans</h1>
        <p className="mt-1 text-sm text-ink-dim">Pick a plan and start earning daily returns.</p>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : !plans || plans.length === 0 ? (
        <EmptyState icon={LineChart} title="No active plans" description="Check back soon — new plans are added regularly." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className={
                "group relative flex flex-col overflow-hidden rounded-2xl border bg-base-surface shadow-panel transition-all hover:-translate-y-0.5 " +
                (p.isFeatured ? "border-mint-dim/60 shadow-stamp" : "border-base-border hover:border-mint-dim/40")
              }
            >
              {p.isFeatured && (
                <div className="flex items-center gap-1.5 bg-mint px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-base">
                  <Star className="h-3 w-3 fill-base" /> Most subscribed
                </div>
              )}

              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-lg font-semibold text-ink">{p.name}</h3>
                {p.description && <p className="mt-1.5 text-sm text-ink-dim">{p.description}</p>}

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-mono text-3xl font-semibold tabular text-ink">{formatMoney(p.price)}</span>
                  <span className="text-xs text-ink-faint">/ {p.durationDays} days</span>
                </div>

                <div className="ledger-tear my-5" />

                <ul className="flex-1 space-y-2.5 text-sm">
                  {p.dailyReward && (
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-ink-dim">
                        <Check className="h-3.5 w-3.5 text-mint" /> Daily reward
                      </span>
                      <span className="font-mono font-semibold tabular text-mint">{formatMoney(p.dailyReward)}</span>
                    </li>
                  )}
                  {p.dailyTaskLimit != null && (
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-ink-dim">
                        <Check className="h-3.5 w-3.5 text-mint" /> Tasks per day
                      </span>
                      <span className="font-mono tabular text-ink">{p.dailyTaskLimit}</span>
                    </li>
                  )}
                  {p.referralRewardRate && (
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-ink-dim">
                        <Check className="h-3.5 w-3.5 text-mint" /> Referral bonus
                      </span>
                      <span className="font-mono tabular text-ink">{Number(p.referralRewardRate) * 100}%</span>
                    </li>
                  )}
                  {p.minimumWithdrawal && (
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-ink-dim">
                        <Check className="h-3.5 w-3.5 text-mint" /> Min. withdrawal
                      </span>
                      <span className="font-mono tabular text-ink">{formatMoney(p.minimumWithdrawal)}</span>
                    </li>
                  )}
                </ul>

                <Button className="mt-6 w-full" onClick={() => setSelected(p)}>
                  Subscribe
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Subscribe to ${selected?.name ?? ""}`}>
        <div className="space-y-4">
          <p className="text-sm text-ink-dim">
            This purchases the plan for{" "}
            <span className="font-mono font-semibold text-ink">{formatMoney(selected?.price)}</span> from your
            account wallet.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button className="w-full" onClick={subscribe} isLoading={submitting}>
            Confirm subscription
          </Button>
        </div>
      </Modal>
    </div>
  );
}
