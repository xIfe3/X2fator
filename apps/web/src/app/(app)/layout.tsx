"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/AppShell";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d11]">
        <Loader2
          className="h-7 w-7 animate-spin text-[#e7b64a]"
          style={{ animationDuration: "0.9s" }}
        />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
