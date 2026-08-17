"use client";

import { useState } from "react";
import { LineChart } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { plansApi, subscriptionsApi } from "@/lib/api/plans";
import type { Plan } from "@/lib/types";
import { Card, CardBody } from "@/components/ui/Card";
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className="flex flex-col justify-between transition-colors hover:border-mint/40">
              <CardBody className="space-y-4">
                <div>
                  <h3 className="font-display text-base font-semibold text-ink">{p.name}</h3>
                  {p.description && <p className="mt-1 text-xs text-ink-dim">{p.description}</p>}
                </div>
                <div className="space-y-1.5 border-t border-base-border pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-dim">Price</span>
                    <span className="font-mono font-semibold tabular text-ink">{formatMoney(p.price)}</span>
                  </div>
                  {p.dailyReturn && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-dim">Daily return</span>
                      <span className="font-mono font-semibold tabular text-mint">{formatMoney(p.dailyReturn)}</span>
                    </div>
                  )}
                  {p.durationDays && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-dim">Duration</span>
                      <span className="font-mono tabular text-ink">{p.durationDays} days</span>
                    </div>
                  )}
                </div>
                <Button className="w-full" onClick={() => setSelected(p)}>
                  Subscribe
                </Button>
              </CardBody>
            </Card>
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
