"use client";

import { Crown, Medal, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatMoney } from "@/lib/utils";
import type { ReferralLeaderboardEntry } from "@/lib/types";

const PODIUM_ORDER = [1, 0, 2] as const;

const RANK_STYLES = [
  {
    icon: Crown,
    ring: "ring-2 ring-yellow-400/70",
    badge: "bg-yellow-400 text-yellow-950",
    height: "h-32 sm:h-36",
    avatarSize: "lg" as const,
  },
  {
    icon: Trophy,
    ring: "ring-2 ring-slate-300/70",
    badge: "bg-slate-300 text-slate-800",
    height: "h-24 sm:h-28",
    avatarSize: "md" as const,
  },
  {
    icon: Medal,
    ring: "ring-2 ring-amber-600/60",
    badge: "bg-amber-600 text-amber-50",
    height: "h-20 sm:h-24",
    avatarSize: "md" as const,
  },
];

export function Leaderboard({
  entries,
}: {
  entries: ReferralLeaderboardEntry[] | null | undefined;
}) {
  if (!entries || entries.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No leaderboard yet"
        description="Be the first to refer active members and claim the top spot."
      />
    );
  }

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3, 15);

  return (
    <div className="space-y-6">
      <Podium entries={podium} />
      {rest.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-ink-faint">
            The rest of the top {entries.length > 15 ? 15 : entries.length}
          </p>
          {rest.map((entry, index) => (
            <div
              key={entry.userId}
              className="flex items-center gap-3 rounded-xl border border-base-border bg-base-raised p-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-base-surface2 text-[11px] font-bold text-ink-dim">
                {index + 4}
              </span>
              <Avatar
                firstName={entry.firstName}
                lastName={entry.lastName}
                size="sm"
              />
              <p className="min-w-0 flex-1 truncate text-sm text-ink">
                {entry.firstName} {entry.lastName}
              </p>
              <span className="shrink-0 text-sm font-medium text-primary">
                {formatMoney(entry.totalEarned)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Podium({ entries }: { entries: ReferralLeaderboardEntry[] }) {
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6">
      {PODIUM_ORDER.map((rank) => {
        const entry = entries[rank];
        const style = RANK_STYLES[rank]!;
        if (!entry) return <div key={rank} className="flex-1" />;

        const Icon = style.icon;

        return (
          <div
            key={entry.userId}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full",
                style.badge,
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>

            <Avatar
              firstName={entry.firstName}
              lastName={entry.lastName}
              size={style.avatarSize}
              className={style.ring}
            />

            <p className="max-w-28 truncate text-center text-sm font-medium text-ink">
              {entry.firstName} {entry.lastName}
            </p>
            <p className="text-xs text-ink-faint">{formatMoney(entry.totalEarned)}</p>

            <div
              className={cn(
                "flex w-full items-center justify-center rounded-t-xl border border-base-border bg-base-surface2",
                style.height,
              )}
            >
              <span className="font-display text-2xl font-semibold text-ink-dim">
                #{rank + 1}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
