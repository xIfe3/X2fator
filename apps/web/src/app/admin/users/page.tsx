"use client";

import { FormEvent, useState } from "react";
import { Users } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import type { AdminUser } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

export default function AdminUsersPage() {
  const { data: users, isLoading, refetch } = useApiQuery(() => adminApi.users.list());
  const { push } = useToast();
  const [actingId, setActingId] = useState<string | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<AdminUser | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    walletType: "account" as "account" | "earnings",
    amount: "",
    direction: "credit" as "credit" | "debit",
    description: "",
  });
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  async function runAction(id: string, action: "suspend" | "activate" | "block") {
    setActingId(id + action);
    try {
      await adminApi.users[action](id);
      push("success", `User ${action}d.`);
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError
          ? err.message
          : `Could not ${action} user — check you hold the users.${action} permission.`,
      );
    } finally {
      setActingId(null);
    }
  }

  async function submitAdjust(e: FormEvent) {
    e.preventDefault();
    if (!adjustTarget) return;
    setAdjustError(null);
    setAdjustSubmitting(true);
    try {
      await adminApi.wallets.adjust(adjustTarget.id, adjustForm);
      push("success", "Wallet adjusted.");
      setAdjustTarget(null);
      setAdjustForm({ walletType: "account", amount: "", direction: "credit", description: "" });
    } catch (err) {
      setAdjustError(err instanceof ApiRequestError ? err.message : "Could not adjust wallet.");
    } finally {
      setAdjustSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Users</h1>
        <p className="mt-1 text-sm text-ink-dim">{users?.length ?? 0} registered users.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !users || users.length === 0 ? (
            <EmptyState icon={Users} title="No users found" />
          ) : (
            <Table>
              <THead>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Joined</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </THead>
              <tbody>
                {users.map((u) => (
                  <Tr key={u.id}>
                    <Td className="font-medium">
                      {u.firstName} {u.lastName}
                    </Td>
                    <Td className="text-ink-dim">{u.email}</Td>
                    <Td className="text-ink-dim">{u.createdAt ? formatDate(u.createdAt) : "—"}</Td>
                    <Td>
                      <StatusPill status={u.status} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          isLoading={actingId === u.id + "activate"}
                          onClick={() => runAction(u.id, "activate")}
                        >
                          Activate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={actingId === u.id + "suspend"}
                          onClick={() => runAction(u.id, "suspend")}
                        >
                          Suspend
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          isLoading={actingId === u.id + "block"}
                          onClick={() => runAction(u.id, "block")}
                        >
                          Block
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAdjustTarget(u)}>
                          Adjust wallet
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
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title={`Adjust wallet — ${adjustTarget?.firstName ?? ""} ${adjustTarget?.lastName ?? ""}`}
      >
        <form onSubmit={submitAdjust} className="space-y-4">
          <Select
            label="Wallet"
            value={adjustForm.walletType}
            onChange={(e) => setAdjustForm((f) => ({ ...f, walletType: e.target.value as "account" | "earnings" }))}
          >
            <option value="account">Account</option>
            <option value="earnings">Earnings</option>
          </Select>
          <Select
            label="Direction"
            value={adjustForm.direction}
            onChange={(e) => setAdjustForm((f) => ({ ...f, direction: e.target.value as "credit" | "debit" }))}
          >
            <option value="credit">Credit (add funds)</option>
            <option value="debit">Debit (remove funds)</option>
          </Select>
          <Input
            label="Amount (NGN)"
            type="number"
            min={0.01}
            step="0.01"
            required
            value={adjustForm.amount}
            onChange={(e) => setAdjustForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <Textarea
            label="Reason"
            required
            minLength={3}
            rows={3}
            value={adjustForm.description}
            onChange={(e) => setAdjustForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Why this adjustment is being made — recorded in the audit log."
          />
          {adjustError && <p className="text-sm text-danger">{adjustError}</p>}
          <Button type="submit" className="w-full" isLoading={adjustSubmitting}>
            Apply adjustment
          </Button>
        </form>
      </Modal>
    </div>
  );
}
