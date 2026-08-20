"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api-client";
import { isValidEmail } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const emailError = touched && !isValidEmail(email) ? "Enter a valid email address" : undefined;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (!isValidEmail(email)) return;

    setIsLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="If an account exists for that address, a reset link is on its way."
        footer={
          <Link href="/login" className="font-medium text-mint hover:underline">
            Back to log in
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mint-soft text-mint">
            <MailCheck className="h-5 w-5" />
          </span>
          <p className="text-sm text-ink-dim">
            We sent instructions to <span className="font-medium text-ink">{email}</span>. The link expires in 30
            minutes.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email on your account and we'll send you a reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-mint hover:underline">
            Back to log in
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
          onBlur={() => setTouched(true)}
          error={emailError}
          placeholder="you@example.com"
        />
        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
