import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordSuccessPage() {
  return (
    <AuthShell title="Password updated" subtitle="Your password has been changed successfully.">
      <div className="flex flex-col items-center gap-5 py-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mint-soft text-mint">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <p className="text-sm text-ink-dim">You can now log in with your new password.</p>
        <Link href="/login" className="w-full">
          <Button className="w-full">Log in</Button>
        </Link>
      </div>
    </AuthShell>
  );
}
