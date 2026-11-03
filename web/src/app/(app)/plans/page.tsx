"use client";

import { useState } from "react";
import { Award, Check, Crown, Users } from "lucide-react";
import { plansApi, subscriptionsApi } from "@/lib/api/plans";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DetailList } from "@/components/ui/DetailList";
import { Money } from "@/components/ui/Money";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api-client";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import type { Plan, Subscription } from "@/lib/types";

export default function PlansPage() {
  const { data: plans, isLoading: plansLoading } = useApiQuery(() =>
    plansApi.listActive(),
  );
  const {
    data: activeSubscription,
    isLoading: activeLoading,
    refetch: refetchActive,
  } = useApiQuery(() => subscriptionsApi.active());
  const {
    data: history,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useApiQuery(() => subscriptionsApi.list());
  const { push } = useToast();

  const [confirming, setConfirming] = useState<Plan | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const highestHeldRank = (history ?? []).reduce(
    (max, sub) => Math.max(max, sub.plan?.rank ?? 0),
    0,
  );

  // History is newest-first. A plan ended by a task-earnings withdrawal
  // (status "completed") can be reactivated at the same rank.
  const canRenewSameRank =
    !activeSubscription && history?.[0]?.status === "completed";

  async function confirmPurchase() {
    if (!confirming) return;
    setPurchasing(true);
    setPurchaseError(null);
    try {
      await subscriptionsApi.purchase(confirming.id);
      push(
        "success",
        `You're now subscribed to ${confirming.name}. Plan activated.`,
      );
      setConfirming(null);
      refetchActive();
      refetchHistory();
    } catch (error) {
      setPurchaseError(
        error instanceof ApiRequestError
          ? error.message
          : "Could not purchase this plan.",
      );
    } finally {
      setPurchasing(false);
    }
  }

  async function cancel() {
    if (!activeSubscription) return;
    setCancelling(true);
    try {
      await subscriptionsApi.cancel(activeSubscription.id);
      push("success", "Subscription cancelled.");
      setConfirmingCancel(false);
      refetchActive();
      refetchHistory();
    } catch (error) {
      push(
        "error",
        error instanceof ApiRequestError
          ? error.message
          : "Could not cancel your subscription.",
      );
    } finally {
      setCancelling(false);
    }
  }

  if (plansLoading || activeLoading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Plans
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Subscribe to a plan to unlock higher daily task limits and rewards.
          You can only ever move up in tier.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your current plan</CardTitle>
        </CardHeader>
        <CardBody>
          {activeSubscription ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Crown className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {activeSubscription.plan?.name ?? "Plan"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmingCancel(true)}
              >
                Cancel subscription
              </Button>
            </div>
          ) : (
            <EmptyState
              icon={Award}
              title="No active plan"
              description="Choose a plan below to get started."
            />
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {plans?.map((plan) => {
          const isCurrent = activeSubscription?.planId === plan.id;
          const isRenewal = canRenewSameRank && plan.rank === highestHeldRank;
          const locked =
            plan.rank <= highestHeldRank && !isCurrent && !isRenewal;

          return (
            <Card
              key={plan.id}
              className={
                plan.isFeatured ? "border-primary/40" : undefined
              }
            >
              <CardBody className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display text-lg font-semibold text-ink">
                        {plan.name}
                      </p>
                      {plan.isFeatured && (
                        <Badge tone="primary">Popular</Badge>
                      )}
                      {isCurrent && <Badge tone="secondary">Current</Badge>}
                    </div>
                    {plan.description && (
                      <p className="mt-1 text-sm text-ink-dim">
                        {plan.description}
                      </p>
                    )}
                  </div>
                  <Money value={plan.price} size="lg" tone="primary" />
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-base-border pt-4 text-sm">
                  <div>
                    <p className="text-xs text-ink-faint">Daily tasks</p>
                    <p className="mt-0.5 font-medium text-ink">
                      {plan.dailyTaskLimit ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-faint">Daily reward</p>
                    <p className="mt-0.5 font-medium text-ink">
                      <Money value={plan.dailyReward ?? "0"} size="sm" />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-faint">Referral reward</p>
                    <p className="mt-0.5 font-medium text-ink">
                      {formatMoney(plan.referralRewardAmount ?? "0")}
                    </p>
                  </div>
                </div>

                {isCurrent ? (
                  <Button className="w-full" disabled>
                    <Check className="h-4 w-4" /> Active plan
                  </Button>
                ) : locked ? (
                  <Button className="w-full" variant="outline" disabled>
                    Lower tier — already unlocked
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setPurchaseError(null);
                      setConfirming(plan);
                    }}
                  >
                    {isRenewal
                      ? "Reactivate this plan"
                      : activeSubscription
                        ? "Upgrade to this plan"
                        : "Subscribe"}
                  </Button>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription history</CardTitle>
        </CardHeader>
        <CardBody>
          {historyLoading ? (
            <PageSkeleton />
          ) : !history || history.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No subscriptions yet"
              description="Your plan history will show up here."
            />
          ) : (
            <div className="space-y-2.5">
              {history.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSub(sub)}
                  className="flex w-full items-center gap-4 rounded-xl border border-base-border bg-base-raised p-4 text-left transition-colors hover:border-base-borderStrong"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {sub.plan?.name ?? "Plan"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      Purchased {formatDate(sub.startsAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Money value={sub.amountPaid} size="sm" />
                    <StatusPill status={sub.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={confirming !== null}
        onClose={() => {
          setConfirming(null);
          setPurchaseError(null);
        }}
        title="Confirm subscription"
      >
        {confirming && (
          <div className="space-y-4">
            <p className="text-sm text-ink-dim">
              {activeSubscription ? "Upgrade to" : "Subscribe to"}{" "}
              <span className="font-medium text-ink">{confirming.name}</span>{" "}
              for{" "}
              <span className="font-medium text-ink">
                <Money value={confirming.price} size="sm" />
              </span>
              ? This amount will be deducted from your account wallet
              balance right away.
            </p>
            {purchaseError && (
              <p className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                {purchaseError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setConfirming(null);
                  setPurchaseError(null);
                }}
                disabled={purchasing}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                isLoading={purchasing}
                onClick={confirmPurchase}
              >
                Confirm & pay
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={confirmingCancel}
        onClose={() => {
          if (!cancelling) setConfirmingCancel(false);
        }}
        title="Cancel subscription?"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-dim">
            Your{" "}
            <span className="font-medium text-ink">
              {activeSubscription?.plan?.name ?? "current"}
            </span>{" "}
            plan will stop immediately and you will no longer earn daily
            rewards from it.
          </p>
          <p className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            You will not get a refund, and you can't buy this plan or any
            lower plan again. To get a plan back you would have to buy a
            higher one.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmingCancel(false)}
              disabled={cancelling}
            >
              Keep my plan
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              isLoading={cancelling}
              onClick={cancel}
            >
              Yes, cancel
            </Button>
          </div>
        </div>
      </Modal>

      <BottomSheet
        open={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        title="Subscription details"
      >
        {selectedSub && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-base-surface2 px-4 py-3.5">
              <div>
                <p className="text-xs text-ink-faint">Amount paid</p>
                <Money value={selectedSub.amountPaid} size="lg" className="mt-0.5" />
              </div>
              <StatusPill status={selectedSub.status} />
            </div>

            <DetailList
              rows={[
                { label: "Plan", value: selectedSub.plan?.name },
                {
                  label: "Daily task limit",
                  value: selectedSub.dailyTaskLimit,
                },
                {
                  label: "Daily reward",
                  value: formatMoney(selectedSub.dailyReward),
                },
                {
                  label: "Referral reward",
                  value: formatMoney(selectedSub.referralRewardAmount),
                },
                { label: "Started", value: formatDateTime(selectedSub.startsAt) },
                {
                  label: "Purchased",
                  value: selectedSub.createdAt
                    ? formatDateTime(selectedSub.createdAt)
                    : undefined,
                },
              ]}
            />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
