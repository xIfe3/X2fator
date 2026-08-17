"use client";

import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { initials, formatDate } from "@/lib/utils";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">{label}</p>
      <p className="mt-1 text-sm text-ink">{value || "—"}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Profile</h1>
        <p className="mt-1 text-sm text-ink-dim">Your account details.</p>
      </div>

      <Card>
        <CardBody className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-base-surface2 font-display text-lg font-semibold text-ink">
            {user ? initials(user.firstName, user.lastName) : "··"}
          </span>
          <div>
            <p className="font-display text-lg font-semibold text-ink">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-ink-dim">{user?.email}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Phone" value={user?.phone ?? ""} />
          <Field label="Referral code" value={user?.referralCode ?? ""} />
          <Field label="Member since" value={user?.createdAt ? formatDate(user.createdAt) : ""} />
          <Field label="Roles" value={user?.roles?.join(", ") ?? "user"} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">Status</p>
            <div className="mt-1.5">
              <StatusPill status={user?.status} />
            </div>
          </div>
        </CardBody>
      </Card>

      <p className="text-xs text-ink-faint">
        Profile editing isn&apos;t available yet — the API doesn&apos;t currently expose a "update my profile"
        endpoint. Add a <code className="rounded bg-base-surface2 px-1 py-0.5">PATCH /users/me</code> route on the
        backend to enable this.
      </p>
    </div>
  );
}
