"use client";

import { FormEvent, useEffect, useState } from "react";
import { Settings, Wallet } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { Money } from "@/components/ui/Money";
import { formatDateTime } from "@/lib/utils";

export default function AdminWithdrawalsPage() {
  const {
    data: pending,
    isLoading,
    refetch,
  } = useApiQuery(() => adminApi.withdrawals.pending());
  const { data: stats, isLoading: statsLoading } = useApiQuery(() =>
    adminApi.withdrawals.stats(),
  );
  const {
    data: settings,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useApiQuery(() => adminApi.withdrawals.settings());
  const { push } = useToast();
  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    referralMinimumWithdrawal: "",
    taskWithdrawalDay: "",
  });
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setSettingsForm({
      referralMinimumWithdrawal: settings.referralMinimumWithdrawal,
      taskWithdrawalDay: String(settings.taskWithdrawalDay),
    });
  }, [settings]);

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setSettingsSubmitting(true);
    try {
      await adminApi.withdrawals.updateSettings({
        referralMinimumWithdrawal: settingsForm.referralMinimumWithdrawal,
        taskWithdrawalDay: Number(settingsForm.taskWithdrawalDay),
      });
      push("success", "Withdrawal rules updated.");
      refetchSettings();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError
          ? err.message
          : "Could not update withdrawal rules.",
      );
    } finally {
      setSettingsSubmitting(false);
    }
  }

  async function approve() {
    if (!approveTarget) return;
    setBusyId(approveTarget);
    try {
      // Approval runs through the generic review endpoint on the
      // user-facing withdrawals controller (PATCH /withdrawals/admin/:id/review).
      await adminApi.withdrawals.review(approveTarget, note || undefined);
      push("success", "Withdrawal approved.");
      setApproveTarget(null);
      setNote("");
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError
          ? err.message
          : "Could not approve withdrawal.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function reject() {
    if (!rejectTarget) return;
    setBusyId(rejectTarget);
    try {
      await adminApi.withdrawals.reject(rejectTarget, note || undefined);
      push("success", "Withdrawal rejected.");
      setRejectTarget(null);
      setNote("");
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError
          ? err.message
          : "Could not reject withdrawal.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Withdrawals
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {pending?.length ?? 0} pending requests.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" /> Withdrawal rules
          </CardTitle>
        </CardHeader>
        <CardBody>
          {settingsLoading ? (
            <PageSkeleton />
          ) : (
            <form
              onSubmit={saveSettings}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end"
            >
              <Input
                label="Referral wallet minimum withdrawal (NGN)"
                type="number"
                min={0}
                step="0.01"
                required
                value={settingsForm.referralMinimumWithdrawal}
                onChange={(e) =>
                  setSettingsForm((f) => ({
                    ...f,
                    referralMinimumWithdrawal: e.target.value,
                  }))
                }
              />
              <Input
                label="Task wallet withdrawal day (1-28)"
                type="number"
                min={1}
                max={28}
                required
                value={settingsForm.taskWithdrawalDay}
                onChange={(e) =>
                  setSettingsForm((f) => ({
                    ...f,
                    taskWithdrawalDay: e.target.value,
                  }))
                }
              />
              <div className="sm:col-span-2">
                <p className="mb-3 text-xs text-ink-dim">
                  Referral wallet withdrawals are allowed anytime, subject to
                  the minimum above. Task wallet withdrawals only open once a
                  month, on the day set above.
                </p>
                <Button type="submit" isLoading={settingsSubmitting}>
                  Save rules
                </Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsLoading
          ? [1, 2, 3, 4].map((item) => <PageSkeleton key={item} />)
          : [
              [
                "Total withdrawn",
                stats?.completedAmount,
                stats?.completedCount,
                "text-primary",
              ],
              [
                "Pending payout value",
                stats?.pendingAmount,
                stats?.pendingCount,
                "text-secondary",
              ],
              [
                "Rejected / cancelled",
                stats?.rejectedAmount,
                stats?.rejectedCount,
                "text-danger",
              ],
              [
                "All requested value",
                stats?.totalAmount,
                stats?.totalCount,
                "text-ink",
              ],
            ].map(([label, amount, count, tone]) => (
              <Card key={label}>
                <CardBody>
                  <p className="text-xs uppercase tracking-wider text-ink-faint">
                    {label}
                  </p>
                  <Money
                    value={amount as string | number | undefined}
                    size="lg"
                    className={`mt-2 block ${tone}`}
                  />
                  <p className="mt-1 text-xs text-ink-dim">
                    {count ?? 0} requests
                  </p>
                </CardBody>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending review</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !pending || pending.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Nothing to review"
              description="No pending withdrawal requests."
            />
          ) : (
            <Table>
              <THead>
                <Th>Bank</Th>
                <Th>Account</Th>
                <Th>Requested</Th>
                <Th className="text-right">Amount</Th>
                <Th className="text-right">Actions</Th>
              </THead>
              <tbody>
                {pending.map((w) => (
                  <Tr key={w.id}>
                    <Td>{w.bankName}</Td>
                    <Td className="font-mono text-xs text-ink-dim">
                      {w.accountNumber} · {w.accountName}
                    </Td>
                    <Td className="text-ink-dim">
                      {formatDateTime(w.createdAt)}
                    </Td>
                    <Td className="text-right">
                      <Money value={w.amount} size="sm" />
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => setApproveTarget(w.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setRejectTarget(w.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="Approve withdrawal"
      >
        <div className="space-y-4">
          <Textarea
            label="Note (optional)"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            className="w-full"
            isLoading={busyId === approveTarget}
            onClick={approve}
          >
            Confirm approval
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject withdrawal"
      >
        <div className="space-y-4">
          <Textarea
            label="Reason (optional)"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            variant="danger"
            className="w-full"
            isLoading={busyId === rejectTarget}
            onClick={reject}
          >
            Confirm rejection
          </Button>
        </div>
      </Modal>
    </div>
  );
}
