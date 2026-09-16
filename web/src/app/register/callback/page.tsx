"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { ApiRequestError } from "@/lib/api-client";

// Flutterwave's global redirect_url lands here after both the signup
// plan-purchase flow and a wallet deposit made via Flutterwave — it
// appends tx_ref (our payment reference) and status as query params.
// We only know which flow this is by trying the registration confirm
// endpoint first; a 400 ("Not a registration payment") means it was a
// deposit, so we send the user to their deposits page to finish there.
export default function RegisterCallbackPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CallbackContent />
    </Suspense>
  );
}

function CallbackContent() {
  const { completeRegistration } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"pending" | "success" | "error">(
    "pending",
  );
  const [message, setMessage] = useState("Confirming your payment...");
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const reference = searchParams.get("tx_ref");
    const txStatus = searchParams.get("status");

    if (!reference) {
      setStatus("error");
      setMessage("Missing payment reference. Please try again.");
      return;
    }

    if (txStatus === "cancelled") {
      setStatus("error");
      setMessage("Payment was cancelled.");
      return;
    }

    completeRegistration(reference)
      .then(() => {
        setStatus("success");
        setMessage("Payment confirmed. Your account is now active.");
        setTimeout(() => router.replace("/getting-started"), 1500);
      })
      .catch((err) => {
        if (err instanceof ApiRequestError && err.statusCode === 400) {
          // Not a registration payment — this was a wallet deposit
          // using the same global Flutterwave callback URL. Forward
          // tx_ref/status so the deposits page can auto-verify it.
          const params = new URLSearchParams();
          params.set("tx_ref", reference);
          if (txStatus) params.set("status", txStatus);
          router.replace(`/deposits?${params.toString()}`);
          return;
        }
        setStatus("error");
        setMessage(
          err instanceof ApiRequestError
            ? err.message
            : "We couldn't confirm your payment. If you were charged, contact support.",
        );
      });
  }, [searchParams, completeRegistration, router]);

  return (
    <AuthShell title="Confirming payment" subtitle="" width="md">
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        {status === "pending" && (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-ink-dim">{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-secondary" />
            <p className="text-sm text-ink-dim">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 text-danger" />
            <p className="text-sm text-ink-dim">{message}</p>
            <Link href="/register">
              <Button variant="outline" size="sm">
                Back to sign up
              </Button>
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}
