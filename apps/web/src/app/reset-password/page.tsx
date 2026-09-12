"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { PasswordField } from "@/components/ui/PasswordField";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api-client";
import { isPasswordValid } from "@/lib/password";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState<{
    password?: boolean;
    confirmPassword?: boolean;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordError =
    touched.password && !isPasswordValid(password)
      ? "Use at least 8 characters"
      : undefined;
  const confirmError =
    touched.confirmPassword && confirmPassword !== password
      ? "Passwords don't match"
      : undefined;
  const canSubmit = isPasswordValid(password) && confirmPassword === password;

  if (!token) {
    return (
      <AuthShell
        title="Link invalid or expired"
        subtitle="This password reset link is no longer valid."
        footer={
          <Link
            href="/forgot-password"
            className="font-medium text-primary hover:underline"
          >
            Request a new link
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <p className="text-sm text-ink-dim">
            Reset links expire 30 minutes after they're requested and can only
            be used once.
          </p>
        </div>
      </AuthShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ password: true, confirmPassword: true });
    setError(null);
    if (!canSubmit) return;

    setIsLoading(true);
    try {
      await authApi.resetPassword({ token: token as string, password });
      router.replace("/reset-password/success");
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Something went wrong. Try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <PasswordField
            label="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={passwordError}
            placeholder="At least 8 characters"
          />
          <PasswordStrength password={password} />
        </div>
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
          error={confirmError}
          placeholder="Re-enter your new password"
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
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
