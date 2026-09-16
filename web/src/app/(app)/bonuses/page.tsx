"use client";

import { useState } from "react";
import { Gift, Trophy, Flame } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { bonusesApi } from "@/lib/api/bonuses";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { cn, formatMoney } from "@/lib/utils";

const MILESTONE_DAYS = 30;

export default function BonusesPage() {
  const { data: status, isLoading, refetch } = useApiQuery(() =>
    bonusesApi.daily(),
  );
  const [claiming, setClaiming] = useState(false);
  const { push } = useToast();

  async function claim() {
    setClaiming(true);
    try {
      const result = await bonusesApi.claimDaily();
      refetch();
      window.dispatchEvent(new Event("wallet-updated"));
      push(
        "success",
        result.isMilestone
          ? `30-day streak complete! ${formatMoney(result.amount)} added to your task wallet.`
          : `${formatMoney(result.amount)} added to your task wallet.`,
      );
    } catch (error) {
      push(
        "error",
        error instanceof ApiRequestError
          ? error.message
          : "Could not claim your bonus.",
      );
    } finally {
      setClaiming(false);
    }
  }

  const milestoneDays = status?.milestoneDays ?? MILESTONE_DAYS;
  const filledDays = status?.claimed
    ? status.currentStreak
    : (status?.nextStreak ?? 0) - 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Daily login streak
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Check in every day to build your streak. Miss a day and it resets
          to day 1 — reach day {milestoneDays} for a big jackpot bonus.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <StatCard
              label="Current streak"
              value={`${status?.currentStreak ?? 0} day${status?.currentStreak === 1 ? "" : "s"}`}
              icon={Flame}
              tone="primary"
            />
            <StatCard
              label="Longest streak"
              value={`${status?.longestStreak ?? 0} day${status?.longestStreak === 1 ? "" : "s"}`}
              icon={Trophy}
              tone="secondary"
            />
          </>
        )}
      </div>

      <Card className="border-primary-dim/40 bg-primary-soft/50">
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-base shadow-stamp">
              <Gift className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                {status?.claimed
                  ? "You've claimed today's bonus"
                  : status?.nextIsMilestone
                    ? `Day ${milestoneDays} milestone — claim your jackpot!`
                    : `Claim day ${status?.nextStreak ?? 1} of ${milestoneDays}`}
              </p>
              <p className="mt-0.5 text-xs text-ink-dim">
                {status?.claimed
                  ? "Come back tomorrow to keep your streak alive."
                  : `Worth ${formatMoney(status?.amount)} today.`}
              </p>
            </div>
          </div>
          <Button
            onClick={claim}
            disabled={status?.claimed || claiming || !status?.enabled}
            isLoading={claiming}
          >
            {status?.claimed ? "Claimed today" : "Claim bonus"}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Streak progress</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
            {Array.from({ length: milestoneDays }, (_, i) => i + 1).map(
              (day) => {
                const filled = day <= filledDays;
                const isMilestoneCell = day === milestoneDays;
                return (
                  <div
                    key={day}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg text-[11px] font-medium",
                      filled
                        ? "bg-primary text-base"
                        : "bg-base-surface2 text-ink-faint",
                      isMilestoneCell && !filled && "border border-secondary-dim/60 text-secondary",
                      isMilestoneCell && filled && "bg-secondary text-base",
                    )}
                  >
                    {day}
                  </div>
                );
              },
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
