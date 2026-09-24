"use client";

import { AlertTriangle, Users } from "lucide-react";
import { useState } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Money } from "@/components/ui/Money";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DetailList } from "@/components/ui/DetailList";
import { formatDateTime } from "@/lib/utils";

export default function AdminReferralsPage() {
  const { data: stats, isLoading: statsLoading } = useApiQuery(() =>
    adminApi.referrals.stats(),
  );
  const { data: referrals, isLoading } = useApiQuery(() =>
    adminApi.referrals.all(),
  );
  const { data: suspicious, isLoading: suspiciousLoading } = useApiQuery(() =>
    adminApi.referrals.suspicious(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: selectedReferral, isLoading: selectedLoading } = useApiQuery(
    () => (selectedId ? adminApi.referrals.get(selectedId) : Promise.resolve(null)),
    [selectedId],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Referrals
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Every referral relationship on the platform, plus a fraud-signal
          watchlist.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statsLoading
          ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)
          : [
              ["Total referrals", stats?.totalReferrals, "text-ink"],
              ["Active referrals", stats?.activeReferrals, "text-primary"],
              [
                "Total commission paid",
                stats?.totalCommission,
                "text-secondary",
                true,
              ],
            ].map(([label, value, tone, isMoney]) => (
              <Card key={label as string}>
                <CardBody>
                  <p className="text-xs uppercase tracking-wider text-ink-faint">
                    {label}
                  </p>
                  {isMoney ? (
                    <Money
                      value={value as string}
                      size="lg"
                      className={`mt-2 block ${tone}`}
                    />
                  ) : (
                    <p className={`mt-2 font-mono text-2xl font-semibold tabular ${tone}`}>
                      {value ?? 0}
                    </p>
                  )}
                </CardBody>
              </Card>
            ))}
      </div>

      {suspicious && suspicious.length > 0 && (
        <Card className="border-danger/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-danger">
              <AlertTriangle className="h-4 w-4" /> Possible referral abuse
            </CardTitle>
          </CardHeader>
          <CardBody>
            <p className="mb-3 text-xs text-ink-dim">
              These referrers picked up 5+ referred signups within a single
              hour — worth a manual look before paying out further
              commission.
            </p>
            <div className="space-y-2">
              {suspicious.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-danger/20 bg-danger-soft p-3.5"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {s.referrerFirstName} {s.referrerLastName}
                    </p>
                    <p className="text-xs text-ink-faint">{s.referrerEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-danger">
                      {s.signupsInHour} signups
                    </p>
                    <p className="text-[11px] text-ink-faint">
                      {formatDateTime(s.hourBucket)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All referral relationships</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading || suspiciousLoading ? (
            <PageSkeleton />
          ) : !referrals || referrals.length === 0 ? (
            <EmptyState icon={Users} title="No referrals yet" />
          ) : (
            <Table>
              <THead>
                <Th>Referrer</Th>
                <Th>Referred user</Th>
                <Th>Status</Th>
                <Th className="text-right">Commission earned</Th>
                <Th>Since</Th>
              </THead>
              <tbody>
                {referrals.map((r) => (
                  <Tr
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(r.id)}
                  >
                    <Td className="text-xs">
                      <p className="font-medium text-ink">
                        {r.referrerFirstName} {r.referrerLastName}
                      </p>
                      <p className="text-ink-faint">{r.referrerEmail}</p>
                    </Td>
                    <Td className="text-xs">
                      <p className="font-medium text-ink">
                        {r.referredFirstName} {r.referredLastName}
                      </p>
                      <p className="text-ink-faint">{r.referredEmail}</p>
                    </Td>
                    <Td>
                      <StatusPill status={r.status} />
                    </Td>
                    <Td className="text-right">
                      <Money value={r.totalCommission} size="sm" />
                    </Td>
                    <Td className="text-ink-dim">
                      {formatDateTime(r.createdAt)}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <BottomSheet
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title="Referral details"
      >
        {selectedLoading ? (
          <Skeleton className="h-48" />
        ) : selectedReferral ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-base-surface2 px-4 py-3.5">
              <div>
                <p className="text-xs text-ink-faint">Total commission</p>
                <Money value={selectedReferral.totalCommission} size="lg" className="mt-0.5" />
              </div>
              <StatusPill status={selectedReferral.status} />
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Referrer
            </p>
            <DetailList
              rows={[
                {
                  label: "Name",
                  value: `${selectedReferral.referrerFirstName} ${selectedReferral.referrerLastName}`,
                  capitalize: false,
                },
                { label: "Username", value: selectedReferral.referrerUsername, capitalize: false },
                { label: "Email", value: selectedReferral.referrerEmail, capitalize: false },
              ]}
            />

            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Referred user
            </p>
            <DetailList
              rows={[
                {
                  label: "Name",
                  value: `${selectedReferral.referredFirstName} ${selectedReferral.referredLastName}`,
                  capitalize: false,
                },
                { label: "Username", value: selectedReferral.referredUsername, capitalize: false },
                { label: "Email", value: selectedReferral.referredEmail, capitalize: false },
                { label: "Phone", value: selectedReferral.referredPhone, capitalize: false },
                { label: "Joined", value: formatDateTime(selectedReferral.referredJoinedAt) },
              ]}
            />

            <DetailList
              rows={[
                { label: "Since", value: formatDateTime(selectedReferral.createdAt) },
              ]}
            />

            {selectedReferral.earnings.length > 0 && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  Commission earnings ({selectedReferral.earnings.length})
                </p>
                <div className="space-y-2">
                  {selectedReferral.earnings.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-lg border border-base-border bg-base-raised px-3 py-2 text-xs"
                    >
                      <span className="text-ink-faint">
                        {formatDateTime(e.createdAt)}
                      </span>
                      <Money value={e.amount} size="sm" tone="primary" />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
