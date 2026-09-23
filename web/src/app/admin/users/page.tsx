"use client";

import { FormEvent, useEffect, useState } from "react";
import { ShieldPlus, Users } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useAuth } from "@/lib/auth-context";
import { adminApi } from "@/lib/api/admin";
import type { AdminUser, AdminWalletDetails } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DetailList } from "@/components/ui/DetailList";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { Money } from "@/components/ui/Money";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AdminUsersPage() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("users.update");
  const canSuspend = hasPermission("users.suspend");
  const canActivate = hasPermission("users.activate");
  const canBlock = hasPermission("users.block");
  const canCreateAdmin = hasPermission("users.create_admin");
  const canAdjustWallet = hasPermission("wallets.adjust");

  const {
    data: users,
    isLoading,
    refetch,
  } = useApiQuery(() => adminApi.users.list());
  const { push } = useToast();
  const [actingId, setActingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    user: AdminUser;
    action: "suspend" | "activate" | "block";
  } | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<AdminUser | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    walletType: "account" as "account" | "task" | "referral",
    amount: "",
    direction: "credit" as "credit" | "debit",
    description: "",
  });
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [walletTarget, setWalletTarget] = useState<AdminUser | null>(null);
  const [walletDetails, setWalletDetails] = useState<AdminWalletDetails | null>(
    null,
  );
  const [walletLoading, setWalletLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const { data: profileUser, isLoading: profileLoading } = useApiQuery(
    () => (profileId ? adminApi.users.get(profileId) : Promise.resolve(null)),
    [profileId],
  );
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "" as "" | "male" | "female" | "other",
    newPassword: "",
  });
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [createAdminForm, setCreateAdminForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    currentAdminPassword: "",
  });
  const [createAdminError, setCreateAdminError] = useState<string | null>(
    null,
  );
  const [createAdminSubmitting, setCreateAdminSubmitting] = useState(false);

  useEffect(() => {
    if (!walletTarget) {
      setWalletDetails(null);
      return;
    }

    setWalletLoading(true);
    adminApi.users
      .wallets(walletTarget.id)
      .then(setWalletDetails)
      .catch((err) =>
        push(
          "error",
          err instanceof ApiRequestError
            ? err.message
            : "Could not load wallet details.",
        ),
      )
      .finally(() => setWalletLoading(false));
  }, [walletTarget, push]);

  async function confirmRunAction() {
    if (!confirmAction) return;
    const { user, action } = confirmAction;
    setActingId(user.id + action);
    try {
      await adminApi.users[action](user.id);
      push("success", `User ${action}d.`);
      setConfirmAction(null);
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
      setAdjustForm({
        walletType: "account",
        amount: "",
        direction: "credit",
        description: "",
      });
    } catch (err) {
      setAdjustError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not adjust wallet.",
      );
    } finally {
      setAdjustSubmitting(false);
    }
  }

  function openEdit(user: AdminUser) {
    setEditTarget(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? "",
      gender: user.gender ?? "",
      newPassword: "",
    });
  }

  function requestEditSave(e: FormEvent) {
    e.preventDefault();
    setConfirmEdit(true);
  }

  async function saveEdit() {
    if (!editTarget) return;
    setEditSubmitting(true);
    try {
      await adminApi.users.update(editTarget.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        gender: editForm.gender || null,
      });
      if (editForm.newPassword) {
        await adminApi.users.resetPassword(editTarget.id, editForm.newPassword);
      }
      push("success", "User details saved.");
      setConfirmEdit(false);
      setEditTarget(null);
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError
          ? err.message
          : "Could not save user details.",
      );
    } finally {
      setEditSubmitting(false);
    }
  }

  async function submitCreateAdmin(e: FormEvent) {
    e.preventDefault();
    setCreateAdminError(null);
    setCreateAdminSubmitting(true);
    try {
      await adminApi.users.createAdmin({
        firstName: createAdminForm.firstName.trim(),
        lastName: createAdminForm.lastName.trim(),
        email: createAdminForm.email.trim(),
        password: createAdminForm.password,
        currentAdminPassword: createAdminForm.currentAdminPassword,
      });
      push("success", "Admin account created.");
      setCreateAdminOpen(false);
      setCreateAdminForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        currentAdminPassword: "",
      });
      refetch();
    } catch (err) {
      setCreateAdminError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not create admin account.",
      );
    } finally {
      setCreateAdminSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Users</h1>
          <p className="mt-1 text-sm text-ink-dim">
            {users?.length ?? 0} registered users.
          </p>
        </div>
        {canCreateAdmin && (
          <Button onClick={() => setCreateAdminOpen(true)}>
            <ShieldPlus className="h-4 w-4" /> Create admin
          </Button>
        )}
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
                <Th>Phone</Th>
                <Th>Joined</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </THead>
              <tbody>
                {users.map((u) => (
                  <Tr
                    key={u.id}
                    className="cursor-pointer"
                    onClick={() => setProfileId(u.id)}
                  >
                    <Td className="font-medium">
                      {u.firstName} {u.lastName}
                    </Td>
                    <Td className="text-ink-dim">{u.email}</Td>
                    <Td className="text-ink-dim">{u.phone ?? "—"}</Td>
                    <Td className="text-ink-dim">
                      {u.createdAt ? formatDate(u.createdAt) : "—"}
                    </Td>
                    <Td>
                      <StatusPill status={u.status} />
                    </Td>
                    <Td className="text-right">
                      <div
                        className="flex justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canActivate && (
                          <Button
                            size="sm"
                            variant="secondary"
                            isLoading={actingId === u.id + "activate"}
                            onClick={() =>
                              setConfirmAction({ user: u, action: "activate" })
                            }
                          >
                            Activate
                          </Button>
                        )}
                        {canSuspend && (
                          <Button
                            size="sm"
                            variant="outline"
                            isLoading={actingId === u.id + "suspend"}
                            onClick={() =>
                              setConfirmAction({ user: u, action: "suspend" })
                            }
                          >
                            Suspend
                          </Button>
                        )}
                        {canBlock && (
                          <Button
                            size="sm"
                            variant="danger"
                            isLoading={actingId === u.id + "block"}
                            onClick={() =>
                              setConfirmAction({ user: u, action: "block" })
                            }
                          >
                            Block
                          </Button>
                        )}
                        {canUpdate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(u)}
                          >
                            Edit user
                          </Button>
                        )}
                        {canAdjustWallet && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAdjustTarget(u)}
                          >
                            Adjust wallet
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setWalletTarget(u)}
                        >
                          Wallet details
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
        open={createAdminOpen}
        onClose={() => setCreateAdminOpen(false)}
        title="Create admin account"
      >
        <form onSubmit={submitCreateAdmin} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="First name"
              required
              value={createAdminForm.firstName}
              onChange={(e) =>
                setCreateAdminForm((f) => ({
                  ...f,
                  firstName: e.target.value,
                }))
              }
            />
            <Input
              label="Last name"
              required
              value={createAdminForm.lastName}
              onChange={(e) =>
                setCreateAdminForm((f) => ({ ...f, lastName: e.target.value }))
              }
            />
          </div>
          <Input
            label="Email"
            type="email"
            required
            value={createAdminForm.email}
            onChange={(e) =>
              setCreateAdminForm((f) => ({ ...f, email: e.target.value }))
            }
          />
          <div>
            <PasswordField
              label="New admin's password"
              autoComplete="new-password"
              required
              value={createAdminForm.password}
              onChange={(e) =>
                setCreateAdminForm((f) => ({
                  ...f,
                  password: e.target.value,
                }))
              }
            />
            <PasswordStrength password={createAdminForm.password} />
          </div>
          <div className="border-t border-base-border pt-4">
            <PasswordField
              label="Your password (to authorize this)"
              autoComplete="current-password"
              required
              hint="Confirms this is really you, not someone else using your logged-in session."
              value={createAdminForm.currentAdminPassword}
              onChange={(e) =>
                setCreateAdminForm((f) => ({
                  ...f,
                  currentAdminPassword: e.target.value,
                }))
              }
            />
          </div>
          {createAdminError && (
            <p className="text-sm text-danger">{createAdminError}</p>
          )}
          <Button
            type="submit"
            className="w-full"
            isLoading={createAdminSubmitting}
          >
            Create admin
          </Button>
        </form>
      </Modal>

      <Modal
        open={!!editTarget && !confirmEdit}
        onClose={() => setEditTarget(null)}
        title={`Edit user — ${editTarget?.firstName ?? ""} ${editTarget?.lastName ?? ""}`}
      >
        <form onSubmit={requestEditSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="First name"
              required
              value={editForm.firstName}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, firstName: e.target.value }))
              }
            />
            <Input
              label="Last name"
              required
              value={editForm.lastName}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, lastName: e.target.value }))
              }
            />
          </div>
          <Input
            label="Email"
            type="email"
            required
            value={editForm.email}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, email: e.target.value }))
            }
          />
          <Input
            label="Phone"
            value={editForm.phone}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, phone: e.target.value }))
            }
          />
          <Select
            label="Gender"
            value={editForm.gender}
            onChange={(e) =>
              setEditForm((f) => ({
                ...f,
                gender: e.target.value as typeof f.gender,
              }))
            }
          >
            <option value="">Not specified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
          <div className="border-t border-base-border pt-4">
            <p className="mb-3 text-xs text-ink-faint">
              Passwords are never viewable. Enter a new password only if you
              need to reset this user&apos;s password.
            </p>
            <PasswordField
              label="New password (optional)"
              autoComplete="new-password"
              value={editForm.newPassword}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, newPassword: e.target.value }))
              }
            />
            <PasswordStrength password={editForm.newPassword} />
          </div>
          <Button type="submit" className="w-full">
            Review changes
          </Button>
        </form>
      </Modal>

      <Modal
        open={confirmEdit}
        onClose={() => setConfirmEdit(false)}
        title="Confirm user changes"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-ink-dim">
            Save these account changes for{" "}
            <span className="font-medium text-ink">{editForm.email}</span>? This
            action will be recorded in the audit log.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmEdit(false)}>
              Cancel
            </Button>
            <Button isLoading={editSubmitting} onClick={saveEdit}>
              Confirm and save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        title={`Adjust wallet — ${adjustTarget?.firstName ?? ""} ${adjustTarget?.lastName ?? ""}`}
      >
        <form onSubmit={submitAdjust} className="space-y-4">
          <Select
            label="Wallet"
            value={adjustForm.walletType}
            onChange={(e) =>
              setAdjustForm((f) => ({
                ...f,
                walletType: e.target.value as "account" | "task" | "referral",
              }))
            }
          >
            <option value="account">Account</option>
            <option value="task">Task</option>
            <option value="referral">Referral</option>
            <option value="earnings">Earnings</option>
          </Select>
          <Select
            label="Direction"
            value={adjustForm.direction}
            onChange={(e) =>
              setAdjustForm((f) => ({
                ...f,
                direction: e.target.value as "credit" | "debit",
              }))
            }
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
            onChange={(e) =>
              setAdjustForm((f) => ({ ...f, amount: e.target.value }))
            }
          />
          <Textarea
            label="Reason"
            required
            minLength={3}
            rows={3}
            value={adjustForm.description}
            onChange={(e) =>
              setAdjustForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Why this adjustment is being made — recorded in the audit log."
          />
          {adjustError && <p className="text-sm text-danger">{adjustError}</p>}
          <Button type="submit" className="w-full" isLoading={adjustSubmitting}>
            Apply adjustment
          </Button>
        </form>
      </Modal>

      <Modal
        open={!!walletTarget}
        onClose={() => setWalletTarget(null)}
        title={`Wallet details — ${walletTarget?.firstName ?? ""} ${walletTarget?.lastName ?? ""}`}
        className="max-w-3xl"
      >
        {walletLoading ? (
          <PageSkeleton />
        ) : walletDetails ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(["account", "task", "referral"] as const).map((walletType) => {
                const wallet = walletDetails.wallets[walletType];
                return (
                  <div
                    key={walletType}
                    className="rounded-xl border border-base-border bg-base-raised p-4"
                  >
                    <p className="text-xs uppercase tracking-wider text-ink-faint">
                      {walletType} wallet
                    </p>
                    <Money value={wallet?.balance ?? "0"} size="lg" className="mt-2 block" />
                    <p className="mt-1 text-xs text-ink-faint">
                      Status: {wallet?.status ?? "not created"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-ink">
                  Wallet transactions
                </h3>
                <span className="text-xs text-ink-faint">
                  {walletDetails.transactions.length} total
                </span>
              </div>
              {walletDetails.transactions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-base-border p-6 text-center text-sm text-ink-faint">
                  No wallet transactions yet.
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-xl border border-base-border">
                  {walletDetails.transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between gap-4 border-b border-base-border p-3 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium capitalize text-ink">
                          {transaction.type.replace(/_/g, " ")}
                        </p>
                        <p className="truncate text-xs text-ink-faint">
                          {transaction.walletType} ·{" "}
                          {transaction.description ?? transaction.reference}
                        </p>
                        <p className="text-[11px] text-ink-faint">
                          {formatDateTime(transaction.createdAt)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Money
                          value={transaction.amount}
                          size="sm"
                          tone={
                            transaction.direction === "credit"
                              ? "primary"
                              : "danger"
                          }
                          signed={transaction.direction}
                        />
                        <p className="text-[11px] text-ink-faint">
                          Balance: {formatMoney(transaction.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <BottomSheet
        open={!!profileId}
        onClose={() => setProfileId(null)}
        title="User profile"
      >
        {profileLoading ? (
          <PageSkeleton />
        ) : profileUser ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-base-surface2 px-4 py-3.5">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {profileUser.firstName} {profileUser.lastName}
                </p>
                <p className="text-xs text-ink-faint">{profileUser.email}</p>
              </div>
              <StatusPill status={profileUser.status} />
            </div>
            <DetailList
              rows={[
                { label: "Username", value: profileUser.username, capitalize: false },
                { label: "Referral code", value: profileUser.referralCode, capitalize: false },
                { label: "Phone", value: profileUser.phone, capitalize: false },
                { label: "Gender", value: profileUser.gender },
                { label: "Roles", value: profileUser.roles?.join(", ") },
                { label: "Login count", value: profileUser.loginCount },
                {
                  label: "Last login",
                  value: profileUser.lastLoginAt
                    ? formatDateTime(profileUser.lastLoginAt)
                    : undefined,
                },
                {
                  label: "Joined",
                  value: profileUser.createdAt
                    ? formatDateTime(profileUser.createdAt)
                    : undefined,
                },
              ]}
            />
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmRunAction}
        title={
          confirmAction
            ? `${capitalize(confirmAction.action)} user`
            : ""
        }
        description={
          confirmAction
            ? `${
                confirmAction.action === "activate"
                  ? "Reactivate"
                  : confirmAction.action === "suspend"
                    ? "Suspend"
                    : "Permanently block"
              } ${confirmAction.user.firstName} ${confirmAction.user.lastName} (${confirmAction.user.email})?${
                confirmAction.action === "block"
                  ? " This is a strong action and should only be used for serious violations."
                  : ""
              }`
            : ""
        }
        confirmLabel={confirmAction ? capitalize(confirmAction.action) : "Confirm"}
        variant={confirmAction?.action === "block" ? "danger" : "primary"}
        isLoading={
          !!confirmAction &&
          actingId === confirmAction.user.id + confirmAction.action
        }
      />
    </div>
  );
}
