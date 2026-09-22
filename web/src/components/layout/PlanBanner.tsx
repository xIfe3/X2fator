"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { subscriptionsApi } from "@/lib/api/plans";

export function PlanBanner() {
  const { data: subscription, isLoading } = useApiQuery(() =>
    subscriptionsApi.active(),
  );

  if (isLoading || subscription) return null;

  return (
    <Link href="/plans" className="gradient-border-banner mb-4 block">
      <div className="gradient-border-banner__inner flex items-center gap-3 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            Get a plan to start earning
          </p>
          <p className="truncate text-xs text-ink-faint">
            Purchase a plan to unlock daily tasks and start earning today.
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
      </div>
    </Link>
  );
}
