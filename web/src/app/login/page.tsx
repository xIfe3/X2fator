"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Gift, Sparkles } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { formatMoney, isValidEmail } from "@/lib/utils";
import { useApiQuery } from "@/hooks/useApiQuery";
import { siteContentApi } from "@/lib/api/site-content";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<{
    email?: boolean;
    password?: boolean;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [offerOpen, setOfferOpen] = useState(true);
  const { data: siteContent } = useApiQuery(() => siteContentApi.get());
  const welcomeBonus = siteContent?.welcome_bonus;
  const welcomeAmount = formatMoney(welcomeBonus?.amount ?? "5000");

  const emailError =
    touched.email && !isValidEmail(email)
      ? "Enter a valid email address"
      : undefined;
  const passwordError =
    touched.password && password.length === 0
      ? "Password is required"
      : undefined;
  const canSubmit = isValidEmail(email) && password.length > 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setError(null);
    if (!canSubmit) return;

    setIsLoading(true);
    try {
      const loggedInUser = await login(email, password);
      push("success", "Welcome back.");
      // Any role beyond the default "user" role is staff — keep this in
      // sync with the isAdmin check in auth-context.tsx.
      const isStaff = loggedInUser.roles?.some((role) => role !== "user");
      router.replace(isStaff ? "/admin" : "/dashboard");
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

  return (
    <>
      <AuthShell
        title="Log in"
        subtitle="Access your wallet, plans, and earnings."
        footer={
          <>
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Create one
            </Link>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={emailError}
            placeholder="you@example.com"
          />
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-ink-dim">Password</span>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordField
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              error={passwordError}
              placeholder="••••••••"
            />
          </div>
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
            Log in
          </Button>
        </form>
      </AuthShell>
      <Modal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        title="Your welcome bonus is ready"
        className="max-w-lg border-base-borderStrong/70 p-5 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)] sm:p-6"
      >
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary-soft p-5 sm:p-6">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full border-[24px] border-primary/10" />
          <div className="absolute -bottom-24 -left-16 h-44 w-44 rounded-full border-[20px] border-primary/10" />
          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-base-surface/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                <Sparkles className="h-3.5 w-3.5" /> New-member reward
              </span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-base shadow-stamp">
                <Gift className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-6 font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
              Get a free {welcomeAmount} after registration.
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-ink-dim">
              Create your account to claim your welcome reward.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="auth"
          size="lg"
          className="group mt-5 w-full"
          onClick={() => {
            setOfferOpen(false);
            router.push("/register");
          }}
        >
          Claim my {welcomeAmount}{" "}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
        <button
          type="button"
          onClick={() => setOfferOpen(false)}
          className="mt-3 w-full rounded-lg py-2 text-sm text-ink-dim transition-colors hover:bg-base-surface2 hover:text-ink"
        >
          Maybe later
        </button>
      </Modal>
    </>
  );
}
