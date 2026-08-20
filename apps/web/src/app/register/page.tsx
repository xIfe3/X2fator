"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { isValidEmail, isValidNigerianPhone } from "@/lib/utils";
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
  const router = useRouter();
  const { push } = useToast();
  const searchParams = useSearchParams();

  const [form, setForm] = useState({ ...initialForm, referralCode: searchParams.get("ref") ?? "" });
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
    firstName: form.firstName.trim().length === 0 ? "First name is required" : undefined,
    lastName: form.lastName.trim().length === 0 ? "Last name is required" : undefined,
    email: !isValidEmail(form.email) ? "Enter a valid email address" : undefined,
    phone: !isValidNigerianPhone(form.phone) ? "Enter a valid phone number, e.g. +2348012345678" : undefined,
    password: !isPasswordValid(form.password) ? "Use at least 8 characters" : undefined,
    confirmPassword: form.confirmPassword !== form.password ? "Passwords don't match" : undefined,
  };

  const validCount = Object.values(errors).filter((e) => !e).length;
  const progress = (validCount / Object.keys(errors).length) * 100;
  const canSubmit = Object.values(errors).every((e) => !e);

  async function onSubmit(e: FormEvent) {
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

    setIsLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        referralCode: form.referralCode || undefined,
      });
      push("success", "Account created.");
      router.replace("/dashboard");
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
      title="Create your account"
      subtitle="Start depositing, subscribing to plans, and earning."
      width="md"
      progress={progress}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-mint hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
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
          onChange={(e) => update("referralCode", e.target.value.toUpperCase())}
          placeholder="XF7K2M"
        />
        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
