"use client";

import Link from "next/link";
import { ScrollText, ShieldCheck, Users, Wallet } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

const links = [
  { href: "/admin/users", label: "Users", icon: Users, desc: "Suspend, activate, or block accounts." },
  { href: "/admin/kyc", label: "KYC review", icon: ShieldCheck, desc: "Approve or reject identity documents." },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: Wallet, desc: "Review pending payout requests." },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, desc: "See every admin action taken." },
];

export default function AdminOverviewPage() {
  const { data: users, isLoading: usersLoading } = useApiQuery(() => adminApi.users.list());
  const { data: pendingKyc, isLoading: kycLoading } = useApiQuery(() => adminApi.kyc.pending());
  const { data: pendingWithdrawals, isLoading: withdrawalsLoading } = useApiQuery(() =>
    adminApi.withdrawals.pending(),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Admin console</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Actions here require the <span className="font-mono text-amber">admin</span> role and the specific
          permission for each action (guarded server-side by <span className="font-mono">PermissionsGuard</span>).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {usersLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-ink-faint">Total users</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular text-ink">{users?.length ?? 0}</p>
            </CardBody>
          </Card>
        )}
        {kycLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-ink-faint">Pending KYC</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular text-amber">{pendingKyc?.length ?? 0}</p>
            </CardBody>
          </Card>
        )}
        {withdrawalsLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <Card>
            <CardBody>
              <p className="text-xs uppercase tracking-wider text-ink-faint">Pending withdrawals</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular text-amber">
                {pendingWithdrawals?.length ?? 0}
              </p>
            </CardBody>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-start gap-3 rounded-2xl border border-base-border bg-base-surface p-5 transition-colors hover:border-amber/40 hover:bg-base-surface2"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-base-surface2 text-amber">
              <l.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">{l.label}</p>
              <p className="mt-0.5 text-xs text-ink-dim">{l.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
