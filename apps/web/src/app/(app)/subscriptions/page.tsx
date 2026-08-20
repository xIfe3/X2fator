"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, ListChecks, XCircle } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { subscriptionsApi } from "@/lib/api/plans";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api-client";
import { cn, formatDate, formatMoney } from "@/lib/utils";

const STATUS_META: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  active: { label: "Active", className: "text-mint", icon: CheckCircle2 },
  completed: {
    label: "Completed",
    className: "text-ink-dim",
    icon: CheckCircle2,
  },
  cancelled: { label: "Cancelled", className: "text-danger", icon: XCircle },
};

function progressPct(startedAt: string, endsAt?: string) {
  if (!endsAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  if (end <= start) return 100;
  return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
}

export default function SubscriptionsPage() {
  const {
    data: subs,
    isLoading,
    refetch,
  } = useApiQuery(() => subscriptionsApi.list());
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { push } = useToast();

  async function cancel(id: string) {
    setCancellingId(id);
    try {
      await subscriptionsApi.cancel(id);
      push("success", "Subscription cancelled.");
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError
          ? err.message
          : "Could not cancel subscription.",
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Subscriptions
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            Your passbook of purchased plans.
          </p>
        </div>
        <Link href="/plans">
          <Button variant="secondary">Browse plans</Button>
        </Link>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : !subs || subs.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No subscriptions yet"
          description="Subscribe to a plan to start earning daily returns."
          action={
            <Link href="/plans">
              <Button size="sm">Browse plans</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {subs.map((s) => {
            const meta = STATUS_META[s.status] ?? {
              label: "Unknown",
              className: "text-ink-dim",
              icon: CheckCircle2,
            };
            const Icon = meta.icon;
            const pct =
              s.status === "active"
                ? progressPct(s.startedAt, s.endsAt)
                : s.status === "completed"
                  ? 100
                  : 0;

            return (
              <div
                key={s.id}
                className="relative overflow-hidden rounded-2xl border border-base-border bg-base-surface shadow-panel"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex items-center gap-4">
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                        s.status === "active"
                          ? "bg-mint-soft"
                          : s.status === "cancelled"
                            ? "bg-danger-soft"
                            : "bg-base-surface2",
                      )}
                    >
                      <Icon className={cn("h-5 w-5", meta.className)} />
                    </span>
                    <div>
                      <p className="font-display text-base font-semibold text-ink">
                        {s.plan?.name ?? s.planId}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-faint">
                        <CalendarClock className="h-3 w-3" />
                        {formatDate(s.startedAt)}{" "}
                        {s.endsAt ? `→ ${formatDate(s.endsAt)}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-6">
                    {s.plan?.dailyReward && (
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                          Daily reward
                        </p>
                        <p className="font-mono text-sm font-semibold tabular text-mint">
                          {formatMoney(s.plan.dailyReward)}
                        </p>
                      </div>
                    )}
                    <span className={cn("stamp-badge", meta.className)}>
                      {meta.label}
                    </span>
                    {s.status === "active" && (
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={cancellingId === s.id}
                        onClick={() => cancel(s.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {s.endsAt && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-surface2">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          s.status === "cancelled" ? "bg-danger/50" : "bg-mint",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
