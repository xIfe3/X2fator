"use client";

import { Trophy } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { referralsApi } from "@/lib/api/referrals";
import { Skeleton } from "@/components/ui/Skeleton";
import { Leaderboard } from "./(app)/referrals/Leaderboard";

export function HomeLeaderboard() {
  const { data: leaderboard, isLoading } = useApiQuery(() =>
    referralsApi.leaderboard(),
  );

  return (
    <section className="border-b border-base-border bg-base-raised">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
          Top referrers
        </p>
        <h2 className="mt-3 flex items-center gap-2 font-display text-3xl text-ink">
          <Trophy className="h-7 w-7 text-primary" /> Leaderboard
        </h2>
        <div className="mt-10">
          {isLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <Leaderboard entries={leaderboard} />
          )}
        </div>
      </div>
    </section>
  );
}
