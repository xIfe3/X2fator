"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { isValidEmail } from "@/lib/utils";

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
      router.replace(
        loggedInUser.roles?.includes("admin") ? "/admin" : "/dashboard",
      );
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
    <AuthShell
      title="Log in"
      subtitle="Access your wallet, plans, and earnings."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-mint hover:underline"
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
              className="text-xs font-medium text-mint hover:underline"
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
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Log in
        </Button>
      </form>
    </AuthShell>
  );
}
