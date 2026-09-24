"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Loader2, Star, X } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import {
  CHARGE_WINDOW_SECONDS,
  ChargeDetailsPanel,
  PaymentMethodPicker,
  POLL_INTERVAL_MS,
  type ChargeMethod,
} from "@/components/payments/ChargeViews";
import { useAuth } from "@/lib/auth-context";
import { useApiQuery } from "@/hooks/useApiQuery";
import { plansApi } from "@/lib/api/plans";
import { siteContentApi } from "@/lib/api/site-content";
import { authApi } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import type { ChargeDetails, RegisterInitResponse } from "@/lib/types";
import { cn, formatMoney, isValidEmail, isValidNigerianPhone, isValidUsername } from "@/lib/utils";
import { isPasswordValid } from "@/lib/password";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

type Touched = Partial<Record<keyof typeof initialForm, boolean>>;

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  phone: "",
  password: "",
  confirmPassword: "",
  referralCode: "",
};

function RegisterForm() {
  const { register, completeRegistration, cancelRegistration } = useAuth();
  const { push } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: siteContent } = useApiQuery(() => siteContentApi.get());
  const requirePlanPurchase =
    siteContent?.feature_flags?.requirePlanPurchase !== false;

  // "details" is the single signup screen (plan picker + form); the
  // rest mirror the wallet-deposit modal's in-app Flutterwave flow.
  const [step, setStep] = useState<"details" | "method" | "fund" | "expired">(
    "details",
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const { data: plans, isLoading: plansLoading } = useApiQuery(() =>
    plansApi.listActive(),
  );
  const [pending, setPending] = useState<RegisterInitResponse | null>(null);
  const [charge, setCharge] = useState<ChargeDetails | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(CHARGE_WINDOW_SECONDS);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Preselect the first plan so the list reads like a choice, not a
  // blank required field.
  useEffect(() => {
    const first = plans?.[0];
    if (!selectedPlanId && first) setSelectedPlanId(first.id);
  }, [plans, selectedPlanId]);

  useEffect(() => stopTimers, []);

  const [form, setForm] = useState({
    ...initialForm,
    referralCode: searchParams.get("ref") ?? "",
  });
  const [touched, setTouched] = useState<Touched>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const usernameCheckId = useRef(0);

  useEffect(() => {
    if (!isValidUsername(form.username)) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    const requestId = ++usernameCheckId.current;
    const username = form.username.trim();

    const timeout = setTimeout(() => {
      authApi
        .checkUsernameAvailability(username)
        .then((res) => {
          if (usernameCheckId.current !== requestId) return;
          setUsernameStatus(res.available ? "available" : "taken");
        })
        .catch(() => {
          if (usernameCheckId.current !== requestId) return;
          setUsernameStatus("idle");
        });
    }, 500);

    return () => clearTimeout(timeout);
  }, [form.username]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function blur(key: keyof typeof form) {
    setTouched((t) => ({ ...t, [key]: true }));
  }

  const errors = {
    firstName:
      form.firstName.trim().length === 0 ? "First name is required" : undefined,
    lastName:
      form.lastName.trim().length === 0 ? "Last name is required" : undefined,
    email: !isValidEmail(form.email)
      ? "Enter a valid email address"
      : undefined,
    username: !isValidUsername(form.username)
      ? "3-30 characters, letters, numbers, and underscores only"
      : usernameStatus === "taken"
        ? "This username is already taken"
        : undefined,
    phone: !isValidNigerianPhone(form.phone)
      ? "Enter a valid phone number, e.g. +2348012345678"
      : undefined,
    password: !isPasswordValid(form.password)
      ? "Use at least 8 characters"
      : undefined,
    confirmPassword:
      form.confirmPassword !== form.password
        ? "Passwords don't match"
        : undefined,
  };

  const validCount = Object.values(errors).filter((e) => !e).length;
  const progress = (validCount / Object.keys(errors).length) * 100;
  const canSubmit =
    Object.values(errors).every((e) => !e) && usernameStatus === "available";

  function errorMessage(err: unknown, fallback: string) {
    return err instanceof ApiRequestError
      ? Array.isArray(err.errors) && err.errors.length > 0
        ? err.errors.join(" ")
        : err.message
      : fallback;
  }

  async function onDetailsSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      username: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });
    setError(null);
    if (requirePlanPurchase && !selectedPlanId) {
      setError("Choose a plan to continue.");
      return;
    }
    if (!canSubmit) return;

    setIsLoading(true);
    try {
      const res = await register({
        email: form.email,
        username: form.username.trim(),
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        referralCode: form.referralCode || undefined,
        planId: requirePlanPurchase ? (selectedPlanId ?? undefined) : undefined,
      });

      if ("paymentReference" in res) {
        // Account exists as `pending` — it activates once the plan
        // payment below is confirmed.
        setPending(res);
        setStep("method");
      } else {
        router.replace("/getting-started");
      }
    } catch (err) {
      const message = errorMessage(err, "Something went wrong. Try again.");
      setError(message);
      push("error", message);
    } finally {
      setIsLoading(false);
    }
  }

  function stopTimers() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    pollRef.current = null;
    tickRef.current = null;
  }

  async function chooseMethod(method: ChargeMethod) {
    if (!pending) return;
    setError(null);
    setIsLoading(true);
    try {
      const result = await authApi.chargeRegistration(
        pending.paymentReference,
        method,
      );
      setCharge(result);
      setStep("fund");
      startWaiting(pending.paymentReference);
    } catch (err) {
      setError(errorMessage(err, "Could not set up payment."));
    } finally {
      setIsLoading(false);
    }
  }

  function onActivated() {
    stopTimers();
    push("success", "Payment confirmed. Your account is now active.");
    router.replace("/getting-started");
  }

  function startWaiting(reference: string) {
    setSecondsLeft(CHARGE_WINDOW_SECONDS);
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          handleExpiry(reference);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        // Resolves (and signs the user in) only once Flutterwave has
        // confirmed the payment and the account was activated.
        await completeRegistration(reference);
        onActivated();
      } catch {
        // Not confirmed yet — keep polling until the window runs out.
      }
    }, POLL_INTERVAL_MS);
  }

  // The server re-checks with Flutterwave before discarding the pending
  // signup, so a transfer that lands right at the wire still activates
  // the account instead of being lost to a race with the timer.
  async function handleExpiry(reference: string) {
    stopTimers();
    try {
      const res = await cancelRegistration(reference);
      if (res.message.startsWith("Registration already completed")) {
        await completeRegistration(reference);
        onActivated();
        return;
      }
    } catch {
      // Fall through to the expired screen either way.
    }
    setStep("expired");
  }

  // Backing out before paying discards the pending account so the same
  // email/username can go straight through again.
  async function abandonPayment() {
    stopTimers();
    if (pending) {
      const reference = pending.paymentReference;
      try {
        const res = await cancelRegistration(reference);
        if (res.message.startsWith("Registration already completed")) {
          await completeRegistration(reference);
          onActivated();
          return;
        }
      } catch {
        // The next register() call cleans up a stale pending user anyway.
      }
    }
    setPending(null);
    setCharge(null);
    setError(null);
    setStep("details");
  }

  return (
    <AuthShell
      title={
        step === "details"
          ? requirePlanPurchase
            ? "Activate & create account"
            : "Create your account"
          : step === "fund"
            ? "Complete your transfer"
            : step === "expired"
              ? "Payment window expired"
              : "Choose payment method"
      }
      subtitle={
        step === "details"
          ? requirePlanPurchase
            ? "Choose your plan and pay the one-time activation fee. Your account is created automatically once the payment is confirmed."
            : "Start depositing, subscribing to plans, and earning."
          : ""
      }
      width="md"
      progress={progress}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {step === "details" ? (
        <form onSubmit={onDetailsSubmit} noValidate className="space-y-4">
          {requirePlanPurchase && (
            <div className="space-y-2.5">
              {plansLoading ? (
                <p className="text-sm text-ink-faint">Loading plans...</p>
              ) : !plans || plans.length === 0 ? (
                <p className="text-sm text-ink-faint">
                  No plans are available right now. Please try again later.
                </p>
              ) : (
                plans.map((plan) => {
                  const selected = selectedPlanId === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      aria-pressed={selected}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary-soft"
                          : "border-base-border hover:border-primary-dim/50",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                          {plan.name}
                          {plan.isFeatured && (
                            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          Activation: {formatMoney(plan.price)}
                        </p>
                      </div>
                      <Money value={plan.price} size="sm" tone="primary" />
                    </button>
                  );
                })
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First name"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              onBlur={() => blur("firstName")}
              error={touched.firstName ? errors.firstName : undefined}
            />
            <Input
              label="Last name"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              onBlur={() => blur("lastName")}
              error={touched.lastName ? errors.lastName : undefined}
            />
          </div>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            onBlur={() => blur("email")}
            error={touched.email ? errors.email : undefined}
            placeholder="you@example.com"
          />
          <div>
            <Input
              label="Username"
              autoComplete="username"
              value={form.username}
              onChange={(e) =>
                update("username", e.target.value.replace(/\s/g, ""))
              }
              onBlur={() => blur("username")}
              error={touched.username ? errors.username : undefined}
              placeholder="Your unique username"
              rightElement={
                usernameStatus === "checking" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-ink-faint" />
                ) : usernameStatus === "available" ? (
                  <Check className="h-4 w-4 text-secondary" />
                ) : usernameStatus === "taken" ? (
                  <X className="h-4 w-4 text-danger" />
                ) : undefined
              }
            />
            {!errors.username && usernameStatus === "checking" && (
              <p className="mt-1.5 text-xs text-ink-faint">
                Checking username availability...
              </p>
            )}
            {!errors.username && usernameStatus === "available" && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-secondary">
                <Check className="h-3.5 w-3.5" /> Username available
              </p>
            )}
          </div>
          <Input
            label="Phone (optional)"
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            onBlur={() => blur("phone")}
            error={touched.phone ? errors.phone : undefined}
            placeholder="+2348012345678"
          />
          <div>
            <PasswordField
              label="Password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              onBlur={() => blur("password")}
              error={touched.password ? errors.password : undefined}
              placeholder="At least 8 characters"
            />
            <PasswordStrength password={form.password} />
          </div>
          <PasswordField
            label="Confirm password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            onBlur={() => blur("confirmPassword")}
            error={touched.confirmPassword ? errors.confirmPassword : undefined}
            placeholder="Re-enter your password"
          />
          <Input
            label="Referral code (optional)"
            value={form.referralCode}
            onChange={(e) =>
              update("referralCode", e.target.value.toUpperCase())
            }
            placeholder="XF7K2M"
          />
          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}
          <Button
            type="submit"
            variant="auth"
            className="w-full"
            isLoading={isLoading}
          >
            {requirePlanPurchase ? "Create account & pay" : "Create account"}
          </Button>
        </form>
      ) : step === "method" ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-dim">
            Pay {formatMoney(pending?.amount)} to activate your{" "}
            <span className="font-medium text-ink">{pending?.planName}</span>{" "}
            account via:
          </p>
          <PaymentMethodPicker submitting={isLoading} onChoose={chooseMethod} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isLoading}
            onClick={abandonPayment}
          >
            Back
          </Button>
        </div>
      ) : step === "fund" && charge ? (
        <div className="space-y-5">
          <ChargeDetailsPanel
            charge={charge}
            secondsLeft={secondsLeft}
            successNote="Your account is activated automatically once payment lands."
          />
          <Button
            type="button"
            variant="outline"
            className="w-full text-danger"
            onClick={abandonPayment}
          >
            <X className="h-4 w-4" /> Cancel
          </Button>
        </div>
      ) : (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">
              This payment window has closed.
            </p>
            <p className="mt-1 text-sm text-ink-dim">
              The account details are no longer valid. No funds were taken —
              try again to get new payment details.
            </p>
          </div>
          <Button
            type="button"
            variant="auth"
            className="w-full"
            onClick={() => {
              setPending(null);
              setCharge(null);
              setStep("details");
            }}
          >
            Try again
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
