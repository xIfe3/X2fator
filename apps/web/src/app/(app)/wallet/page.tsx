"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronLeft,
  ChevronRight,
  Wallet as WalletIcon,
  Users,
} from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { walletApi } from "@/lib/api/wallet";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default function WalletPage() {
  const [type, setType] = useState<"account" | "task" | "referral">("account");
  const { data: wallets, isLoading: walletsLoading } = useApiQuery(() =>
    walletApi.getWallets(),
  );
  const { data: txns, isLoading: txnsLoading } = useApiQuery(
    () => walletApi.getTransactions(type),
    [type],
  );
  const cards = [
    {
      key: "account" as const,
      label: "Account wallet",
      balance: wallets?.account.balance,
      status: wallets?.account.status ?? "—",
      icon: ArrowDownToLine,
      tone: "primary" as const,
      actions: [
        { href: "/deposits", label: "Deposit", variant: "primary" as const },
        { href: "/withdrawals", label: "Withdraw", variant: "outline" as const },
      ],
    },
    {
      key: "task" as const,
      label: "Task wallet",
      balance: wallets?.task.balance,
      status: wallets?.task.status ?? "—",
      icon: WalletIcon,
      tone: "secondary" as const,
      actions: [
        { href: "/withdrawals", label: "Withdraw", variant: "primary" as const },
        { href: "/tasks", label: "Earn more", variant: "outline" as const },
      ],
    },
    {
      key: "referral" as const,
      label: "Referral wallet",
      balance: wallets?.referral.balance,
      status: "Referral bonuses only",
      icon: Users,
      tone: "secondary" as const,
      actions: [
        {
          href: "/referrals",
          label: "View referrals",
          variant: "outline" as const,
        },
      ],
    },
  ];

  // `loop: false` -- Embla stops at the first/last slide instead of
  // wrapping back around, per the user's explicit request.
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (walletsLoading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Wallet
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Keep funding, task rewards, and referral bonuses separate.
        </p>
      </div>

      <div>
        <div className="group relative overflow-hidden rounded-2xl" ref={emblaRef}>
          <div className="flex">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className="min-w-0 flex-[0_0_100%] px-0.5">
                  <Card className="relative min-h-55 overflow-hidden sm:min-h-45">
                    <CardBody className="flex h-full flex-col justify-between gap-6 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-4">
                        <span
                          className={
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14 " +
                            (card.tone === "primary"
                              ? "bg-primary-soft text-primary"
                              : "bg-secondary-soft text-secondary")
                          }
                        >
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                            {card.label}
                          </p>
                          <p className="mt-1.5 whitespace-nowrap font-mono text-2xl font-semibold tabular text-ink sm:text-3xl">
                            {formatMoney(card.balance)}
                          </p>
                          <p className="mt-1.5 text-xs capitalize text-ink-faint">
                            {card.status}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-base-border pt-4 sm:w-56 sm:shrink-0 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                        {card.actions.map((action) => (
                          <Link
                            key={action.href + action.label}
                            href={action.href}
                            className={
                              card.actions.length === 1
                                ? "col-span-2"
                                : undefined
                            }
                          >
                            <Button
                              size="sm"
                              variant={
                                action.variant === "primary"
                                  ? "primary"
                                  : "outline"
                              }
                              className="w-full whitespace-nowrap"
                            >
                              {action.label}
                            </Button>
                          </Link>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            aria-label="Previous wallet"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canScrollPrev}
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-base-border bg-base-surface/90 text-ink-dim opacity-0 shadow-panel backdrop-blur transition-opacity hover:text-ink group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next wallet"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canScrollNext}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-base-border bg-base-surface/90 text-ink-dim opacity-0 shadow-panel backdrop-blur transition-opacity hover:text-ink group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {cards.map((card, index) => (
            <button
              key={card.key}
              type="button"
              aria-label={`Show ${card.label}`}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`h-1.5 rounded-full transition-all ${
                selectedIndex === index ? "w-6 bg-primary" : "w-1.5 bg-base-border"
              }`}
            />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
          <Tabs
            tabs={[
              { key: "account", label: "Account" },
              { key: "task", label: "Tasks & bonus" },
              { key: "referral", label: "Referrals" },
            ]}
            active={type}
            onChange={(k) => setType(k as "account" | "task" | "referral")}
          />
        </CardHeader>
        <CardBody>
          {txnsLoading && !txns ? (
            <div className="space-y-2.5">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : !txns || txns.length === 0 ? (
            <EmptyState
              icon={ArrowUpFromLine}
              title="No transactions"
              description={`No ${type} wallet activity yet.`}
            />
          ) : (
            <div className="space-y-2.5">
              {txns.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-4 rounded-xl border border-base-border bg-base-raised p-4 transition-colors hover:border-base-borderStrong"
                >
                  <span
                    className={
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full " +
                      (t.direction === "credit"
                        ? "bg-primary-soft text-primary"
                        : "bg-danger-soft text-danger")
                    }
                  >
                    {t.direction === "credit" ? (
                      <ArrowDownToLine className="h-4.5 w-4.5" />
                    ) : (
                      <ArrowUpFromLine className="h-4.5 w-4.5" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium capitalize text-ink">
                      {t.description || t.type.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      {formatDateTime(t.createdAt)}
                    </p>
                  </div>

                  <span
                    className={
                      "shrink-0 font-mono text-sm font-semibold tabular " +
                      (t.direction === "credit" ? "text-primary" : "text-danger")
                    }
                  >
                    {t.direction === "credit" ? "+" : "−"}
                    {formatMoney(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
