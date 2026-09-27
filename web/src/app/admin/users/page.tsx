"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronRight, Search, ShieldPlus, Users, X } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useAuth } from "@/lib/auth-context";
import { adminApi } from "@/lib/api/admin";
import type { AdminUser, AdminWalletDetails } from "@/lib/types";
import { Card, CardBody } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Pagination } from "@/components/ui/Pagination";
import {
  UserDetailPanel,
  type UserAction,
} from "@/components/admin/UserDetailPanel";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { Money } from "@/components/ui/Money";

const PAGE_SIZE = 20;

type StatusFilter = "all" | AdminUser["status"];
type RoleFilter = "all" | "staff" | "user";
type PlanFilter = "all" | "with_plan" | "no_plan";
type SortKey =
  | "newest"
  | "oldest"
  | "name"
  | "balance"
  | "referrals"
  | "last_login";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Anyone holding a role beyond the base "user" role is staff.
function isStaff(user: AdminUser) {
  return (user.roles ?? []).some((r) => r !== "user");
}

function sortUsers(list: AdminUser[], key: SortKey) {
  const time = (v?: string | null) => (v ? new Date(v).getTime() : 0);
  const sorted = [...list];
  switch (key) {
    case "oldest":
      return sorted.sort((a, b) => time(a.createdAt) - time(b.createdAt));
    case "name":
      return sorted.sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
        ),
      );
    case "balance":
      return sorted.sort(
        (a, b) => Number(b.totalBalance ?? 0) - Number(a.totalBalance ?? 0),
      );
    case "referrals":
      return sorted.sort(
        (a, b) => (b.referralCount ?? 0) - (a.referralCount ?? 0),
      );
    case "last_login":
      return sorted.sort((a, b) => time(b.lastLoginAt) - time(a.lastLoginAt));
    default:
      return sorted.sort((a, b) => time(b.createdAt) - time(a.createdAt));
  }
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
  const {
    data: profileUser,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useApiQuery(
    () => (profileId ? adminApi.users.get(profileId) : Promise.resolve(null)),
    [profileId],
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);

  const statusCounts = useMemo(() => {
    const counts = { all: 0, active: 0, suspended: 0, blocked: 0 };
    for (const u of users ?? []) {
      counts.all++;
      if (u.status in counts) counts[u.status as keyof typeof counts]++;
    }
    return counts;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^@/, "");
    const matches = (users ?? []).filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (roleFilter === "staff" && !isStaff(u)) return false;
      if (roleFilter === "user" && isStaff(u)) return false;
      if (planFilter === "with_plan" && !u.activePlan) return false;
      if (planFilter === "no_plan" && u.activePlan) return false;
      if (!q) return true;
      return [
        `${u.firstName} ${u.lastName}`,
        u.username,
        u.email,
        u.phone,
        u.referralCode,
      ].some((field) => field?.toLowerCase().includes(q));
    });
    return sortUsers(matches, sortKey);
  }, [users, search, statusFilter, roleFilter, planFilter, sortKey]);

  // Any change to what's being shown sends the admin back to page one.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, roleFilter, planFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pageUsers = filteredUsers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const hasFilters =
    !!search ||
    statusFilter !== "all" ||
    roleFilter !== "all" ||
    planFilter !== "all" ||
    sortKey !== "newest";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setRoleFilter("all");
    setPlanFilter("all");
    setSortKey("newest");
  }

  function refreshAll() {
    refetch();
    if (profileId) refetchProfile();
  }
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
      refreshAll();
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
      refreshAll();
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
      refreshAll();
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
            {statusCounts.all} registered users · {statusCounts.active} active
          </p>
        </div>
        {canCreateAdmin && (
          <Button onClick={() => setCreateAdminOpen(true)}>
            <ShieldPlus className="h-4 w-4" /> Create admin
          </Button>
        )}
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="overflow-x-auto">
            <Tabs
              active={statusFilter}
              onChange={(key) => setStatusFilter(key as StatusFilter)}
              tabs={[
                { key: "all", label: `All (${statusCounts.all})` },
                { key: "active", label: `Active (${statusCounts.active})` },
                {
                  key: "suspended",
                  label: `Suspended (${statusCounts.suspended})`,
                },
                { key: "blocked", label: `Blocked (${statusCounts.blocked})` },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input
                placeholder="Search name, @username, email, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Search users"
                rightElement={
                  search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="text-ink-faint hover:text-ink"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : undefined
                }
              />
            </div>
            <Select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            >
              <option value="all">All roles</option>
              <option value="user">Regular users</option>
              <option value="staff">Admins &amp; staff</option>
            </Select>
            <Select
              aria-label="Filter by plan"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
            >
              <option value="all">Any plan</option>
              <option value="with_plan">Has active plan</option>
              <option value="no_plan">No active plan</option>
            </Select>
            <Select
              aria-label="Sort users"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="balance">Highest balance</option>
              <option value="referrals">Most referrals</option>
              <option value="last_login">Recently active</option>
            </Select>
          </div>

          {hasFilters && !isLoading && (
            <div className="flex items-center justify-between text-xs text-ink-faint">
              <span>
                Showing {filteredUsers.length} of {statusCounts.all} users
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="font-medium text-primary hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}

          {isLoading ? (
            <PageSkeleton />
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={
                hasFilters ? "No users match these filters" : "No users found"
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <THead>
                    <Th>User</Th>
                    <Th>Contact</Th>
                    <Th>Plan</Th>
                    <Th className="text-right">Balance</Th>
                    <Th className="text-right">Referrals</Th>
                    <Th>Joined</Th>
                    <Th>Status</Th>
                    <Th className="w-8" />
                  </THead>
                  <tbody>
                    {pageUsers.map((u) => (
                      <Tr
                        key={u.id}
                        className="cursor-pointer"
                        onClick={() => setProfileId(u.id)}
                      >
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar
                              firstName={u.firstName}
                              lastName={u.lastName}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate font-medium">
                                {u.firstName} {u.lastName}
                                {isStaff(u) && (
                                  <Badge
                                    tone="info"
                                    className="px-1.5 py-0 text-[10px]"
                                  >
                                    Staff
                                  </Badge>
                                )}
                              </p>
                              <p className="truncate text-xs text-primary">
                                @{u.username}
                              </p>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <p className="max-w-[220px] truncate text-ink-dim">
                            {u.email}
                          </p>
                          <p className="text-xs text-ink-faint">
                            {u.phone ?? "No phone"}
                          </p>
                        </Td>
                        <Td className="text-ink-dim">
                          {u.activePlan ?? (
                            <span className="text-ink-faint">—</span>
                          )}
                        </Td>
                        <Td className="text-right">
                          <Money value={u.totalBalance ?? "0"} />
                        </Td>
                        <Td className="text-right text-ink-dim">
                          {u.referralCount ?? 0}
                        </Td>
                        <Td className="whitespace-nowrap text-ink-dim">
                          {u.createdAt ? formatDate(u.createdAt) : "—"}
                        </Td>
                        <Td>
                          <StatusPill status={u.status} />
                        </Td>
                        <Td>
                          <ChevronRight className="h-4 w-4 text-ink-faint" />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-base-border rounded-xl border border-base-border md:hidden">
                {pageUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setProfileId(u.id)}
                    className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-base-surface2/60"
                  >
                    <Avatar firstName={u.firstName} lastName={u.lastName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-ink">
                          {u.firstName} {u.lastName}
                        </p>
                        <StatusPill status={u.status} />
                      </div>
                      <p className="truncate text-xs text-primary">
                        @{u.username}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-faint">
                        {formatMoney(u.totalBalance ?? "0")} ·{" "}
                        {u.activePlan ?? "No plan"} · {u.referralCount ?? 0}{" "}
                        referrals
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
              />
            </>
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

      <UserDetailPanel
        open={!!profileId}
        onClose={() => setProfileId(null)}
        user={profileUser}
        isLoading={profileLoading}
        permissions={{
          canUpdate,
          canSuspend,
          canActivate,
          canBlock,
          canAdjustWallet,
        }}
        onEdit={openEdit}
        onAdjustWallet={setAdjustTarget}
        onViewWallet={setWalletTarget}
        onAction={(user, action: UserAction) =>
          setConfirmAction({ user, action })
        }
        onOpenUser={setProfileId}
      />

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
