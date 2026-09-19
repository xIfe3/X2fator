"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { useAuth } from "@/lib/auth-context";
import { useApiQuery } from "@/hooks/useApiQuery";
import { plansApi } from "@/lib/api/plans";
import { siteContentApi } from "@/lib/api/site-content";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { cn, isValidEmail, isValidNigerianPhone } from "@/lib/utils";
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
  phone: "",
  password: "",
  confirmPassword: "",
  referralCode: "",
};

function RegisterForm() {
  const { register } = useAuth();
  const { push } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: siteContent } = useApiQuery(() => siteContentApi.get());
  const requirePlanPurchase =
    siteContent?.feature_flags?.requirePlanPurchase !== false;

  const [step, setStep] = useState<"details" | "plan">("details");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const { data: plans, isLoading: plansLoading } = useApiQuery(() =>
    plansApi.listActive(),
  );

  const [form, setForm] = useState({
    ...initialForm,
    referralCode: searchParams.get("ref") ?? "",
  });
  const [touched, setTouched] = useState<Touched>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
  const canSubmit = Object.values(errors).every((e) => !e);

  async function onDetailsSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });
    setError(null);
    if (!canSubmit) return;

    if (requirePlanPurchase) {
      setStep("plan");
      return;
    }

    // No plan required — register and activate immediately, no
    // Flutterwave checkout step.
    setIsLoading(true);
    try {
      await submitRegistration();
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? Array.isArray(err.errors) && err.errors.length > 0
            ? err.errors.join(" ")
            : err.message
          : "Something went wrong. Try again.";
      setError(message);
      push("error", message);
    } finally {
      setIsLoading(false);
    }
  }

  async function submitRegistration() {
    const res = await register({
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone || undefined,
      referralCode: form.referralCode || undefined,
      planId: selectedPlanId ?? undefined,
    });

    if ("authorizationUrl" in res) {
      window.location.assign(res.authorizationUrl);
    } else {
      router.replace("/getting-started");
    }
  }

  async function onPlanConfirm() {
    if (!selectedPlanId) {
      setError("Choose a plan to continue.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await submitRegistration();
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? Array.isArray(err.errors) && err.errors.length > 0
            ? err.errors.join(" ")
            : err.message
          : "Something went wrong. Try again.";
      setError(message);
      push("error", message);
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start depositing, subscribing to plans, and earning."
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
            {requirePlanPurchase ? "Continue" : "Create account"}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-dim">
            Choose a plan to activate your account. You&apos;ll be redirected
            to Flutterwave to pay securely — your account activates as soon
            as payment is confirmed.
          </p>

          {plansLoading ? (
            <p className="text-sm text-ink-faint">Loading plans...</p>
          ) : !plans || plans.length === 0 ? (
            <p className="text-sm text-ink-faint">
              No plans are available right now. Please try again later.
            </p>
          ) : (
            <div className="space-y-2.5">
              {plans.map((plan) => {
                const selected = selectedPlanId === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary-soft"
                        : "border-base-border hover:border-primary-dim/50",
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {plan.name}
                      </p>
                      {plan.description && (
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {plan.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Money value={plan.price} size="sm" tone="primary" />
                      {selected && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep("details")}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="auth"
              className="flex-1"
              isLoading={isLoading}
              disabled={!selectedPlanId}
              onClick={onPlanConfirm}
            >
              Continue to payment
            </Button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
