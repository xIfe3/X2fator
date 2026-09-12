"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Gift, ListChecks, Wallet, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { siteContentApi } from "@/lib/api/site-content";
import { useApiQuery } from "@/hooks/useApiQuery";
import { formatMoney } from "@/lib/utils";

const STORAGE_KEY = "2xf_getting_started_step";

const steps = [
  {
    eyebrow: "Welcome to X2Factor",
    title: "Your earning space is ready.",
    description:
      "Take a quick look around and learn how to turn simple actions into progress.",
    icon: Gift,
  },
  {
    eyebrow: "Step 1",
    title: "Find tasks that fit you.",
    description:
      "Browse available tasks, follow the instructions, and submit proof when you are done.",
    icon: ListChecks,
  },
  {
    eyebrow: "Step 2",
    title: "Keep your rewards in view.",
    description:
      "Approved task earnings and bonuses appear in your task wallet, ready to track.",
    icon: Wallet,
  },
  {
    eyebrow: "You are ready",
    title: "Start with one small move.",
    description:
      "Explore your dashboard, complete your first task, and build from there.",
    icon: Check,
  },
] as const;

export default function GettingStartedPage() {
  const { user } = useAuth();
  const { data: siteContent } = useApiQuery(() => siteContentApi.get());
  const [step, setStep] = useState(0);

  useEffect(() => {
    const savedStep = Number(window.localStorage.getItem(STORAGE_KEY));
    if (
      Number.isInteger(savedStep) &&
      savedStep >= 0 &&
      savedStep < steps.length
    ) {
      setStep(savedStep);
    }
  }, []);

  function moveTo(nextStep: number) {
    setStep(nextStep);
    window.localStorage.setItem(STORAGE_KEY, String(nextStep));
  }

  function finish() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const current = steps[step] ?? steps[0];
  const Icon = current.icon;
  const welcomeAmount = formatMoney(
    siteContent?.welcome_bonus?.amount ?? "5000",
  );

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Getting started
          </p>
          <p className="mt-1 text-sm text-ink-dim">
            Welcome, {user?.firstName}
          </p>
        </div>
        <Link
          href="/dashboard"
          onClick={finish}
          aria-label="Skip getting started"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-base-border bg-base-surface text-ink-dim hover:text-ink"
        >
          <X className="h-4 w-4" />
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-base-border bg-base-surface shadow-[0_12px_30px_-20px_rgba(44,82,151,0.6)]">
        <div className="h-1 bg-base-surface2">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Icon className="h-7 w-7" />
          </div>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {current.eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            {current.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-dim">
            {step === 0
              ? `${current.description} Your free ${welcomeAmount} welcome reward is waiting after registration.`
              : current.description}
          </p>

          <div
            className="mt-8 flex items-center gap-2"
            aria-label={`Step ${step + 1} of ${steps.length}`}
          >
            {steps.map((item, index) => (
              <span
                key={item.eyebrow}
                className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-base-surface2"}`}
              />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => moveTo(Math.max(0, step - 1))}
              disabled={step === 0}
              className="text-sm font-medium text-ink-dim hover:text-ink disabled:invisible"
            >
              Back
            </button>
            {step === steps.length - 1 ? (
              <Link href="/dashboard" onClick={finish}>
                <Button type="button">
                  Go to dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button type="button" onClick={() => moveTo(step + 1)}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-ink-faint">
        You can skip this tour and return to it whenever you are ready.
      </p>
    </div>
  );
}
