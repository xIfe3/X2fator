"use client";

import { FormEvent, useState } from "react";
import { Plus, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api-client";
import type { RoleWithPermissions } from "@/lib/types";

function PermissionGrid({
  permissions,
  selected,
  onToggle,
}: {
  permissions: { name: string; description: string | null }[];
  selected: Set<string>;
  onToggle: (name: string) => void;
}) {
  return (
    <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-xl border border-base-border p-3">
      {permissions.map((p) => (
        <label
          key={p.name}
          className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-base-surface2"
        >
          <input
            type="checkbox"
            checked={selected.has(p.name)}
            onChange={() => onToggle(p.name)}
            className="mt-0.5 h-4 w-4 rounded border-base-border text-primary focus:ring-primary"
          />
          <span>
            <span className="block text-sm font-medium text-ink">
              {p.name}
            </span>
            {p.description && (
              <span className="block text-xs text-ink-faint">
                {p.description}
              </span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

function CreateRoleModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { data: permissions } = useApiQuery(() => adminApi.roles.permissions());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      push("error", "Role name is required.");
      return;
    }
    setSaving(true);
    try {
      await adminApi.roles.create({
        name: name.trim(),
        description: description.trim() || undefined,
        permissionNames: [...selected],
      });
      push("success", "Role created.");
      setName("");
      setDescription("");
      setSelected(new Set());
      onCreated();
      onClose();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError ? err.message : "Could not create role.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create role" className="max-w-lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Role name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Finance Admin"
        />
        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this role is for"
        />
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Permissions</p>
          <PermissionGrid
            permissions={permissions ?? []}
            selected={selected}
            onToggle={toggle}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Create role
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditPermissionsModal({
  role,
  onClose,
  onSaved,
}: {
  role: RoleWithPermissions | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!role) return null;
  return (
    <EditPermissionsModalInner role={role} onClose={onClose} onSaved={onSaved} />
  );
}

function EditPermissionsModalInner({
  role,
  onClose,
  onSaved,
}: {
  role: RoleWithPermissions;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: permissions } = useApiQuery(() => adminApi.roles.permissions());
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(role.permissions),
  );
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function onSave() {
    setSaving(true);
    try {
      await adminApi.roles.setPermissions(role.id, [...selected]);
      push("success", "Permissions updated.");
      onSaved();
      onClose();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError
          ? err.message
          : "Could not update permissions.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit permissions — ${role.name}`}
      className="max-w-lg"
    >
      <div className="space-y-4">
        <PermissionGrid
          permissions={permissions ?? []}
          selected={selected}
          onToggle={toggle}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button isLoading={saving} onClick={onSave}>
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AssignStaffModal({
  open,
  onClose,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
}) {
  // Refetch every time the modal opens rather than once on mount — this
  // component (like the other role modals) stays mounted the whole time
  // the roles page is open, just toggled via `open`, so a role created
  // after the page first loaded would otherwise never show up here
  // without a full page reload.
  const { data: users } = useApiQuery(() => adminApi.users.list(), [open]);
  const { data: roles } = useApiQuery(() => adminApi.roles.list(), [open]);
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId || !roleId) {
      push("error", "Choose both a user and a role.");
      return;
    }
    setSaving(true);
    try {
      await adminApi.roles.assign(userId, roleId);
      push("success", "Role assigned.");
      setUserId("");
      setRoleId("");
      onAssigned();
      onClose();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError ? err.message : "Could not assign role.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign staff role" className="max-w-lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <SearchSelect
          label="User"
          required
          placeholder="Select a user"
          searchPlaceholder="Search by name or email…"
          value={userId}
          onChange={setUserId}
          options={
            users?.map((u) => ({
              value: u.id,
              label: `${u.firstName} ${u.lastName} — ${u.email}`,
            })) ?? []
          }
        />
        <SearchSelect
          label="Role"
          required
          placeholder="Select a role"
          searchPlaceholder="Search roles…"
          value={roleId}
          onChange={setRoleId}
          options={
            roles
              ?.filter((r) => r.name !== "user")
              .map((r) => ({ value: r.id, label: r.name })) ?? []
          }
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Assign
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminRolesPage() {
  const {
    data: roles,
    isLoading: rolesLoading,
    refetch: refetchRoles,
  } = useApiQuery(() => adminApi.roles.list());
  const {
    data: staff,
    isLoading: staffLoading,
    refetch: refetchStaff,
  } = useApiQuery(() => adminApi.roles.staff());

  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleWithPermissions | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState<{ userId: string; roleId: string } | null>(
    null,
  );
  const { push } = useToast();

  function refreshAll() {
    refetchRoles();
    refetchStaff();
  }

  async function onConfirmDelete() {
    if (!deletingRole) return;
    setDeleting(true);
    try {
      await adminApi.roles.remove(deletingRole.id);
      push("success", "Role deleted.");
      setDeletingRole(null);
      refreshAll();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError ? err.message : "Could not delete role.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function onUnassign() {
    if (!removing) return;
    try {
      await adminApi.roles.unassign(removing.userId, removing.roleId);
      push("success", "Role removed.");
      refreshAll();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError ? err.message : "Could not remove role.",
      );
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Roles & staff
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            Create custom admin roles, control what each one can do, and
            assign staff to them.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAssignOpen(true)}>
            <UserPlus className="h-4 w-4" /> Assign staff
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New role
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Roles
          </CardTitle>
        </CardHeader>
        <CardBody>
          {rolesLoading ? (
            <PageSkeleton />
          ) : !roles || roles.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No roles"
              description="No roles exist yet."
            />
          ) : (
            <Table>
              <THead>
                <Th>Role</Th>
                <Th>Permissions</Th>
                <Th>Staff</Th>
                <Th>Actions</Th>
              </THead>
              <tbody>
                {roles.map((r) => (
                  <Tr key={r.id}>
                    <Td>
                      <p className="font-medium text-ink">{r.name}</p>
                      {r.description && (
                        <p className="text-xs text-ink-faint">{r.description}</p>
                      )}
                      {r.isSystemRole && (
                        <Badge className="mt-1" tone="neutral">
                          System role
                        </Badge>
                      )}
                    </Td>
                    <Td className="max-w-xs text-xs text-ink-dim">
                      {r.permissions.length === 0
                        ? "—"
                        : r.permissions.length > 4
                          ? `${r.permissions.slice(0, 4).join(", ")} +${r.permissions.length - 4} more`
                          : r.permissions.join(", ")}
                    </Td>
                    <Td className="text-ink-dim">{r.staffCount}</Td>
                    <Td>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={r.isSystemRole}
                          onClick={() => setEditingRole(r)}
                        >
                          Edit permissions
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={r.isSystemRole || r.staffCount > 0}
                          onClick={() => setDeletingRole(r)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      <Card>
        <CardHeader>
          <CardTitle>Staff</CardTitle>
        </CardHeader>
        <CardBody>
          {staffLoading ? (
            <PageSkeleton />
          ) : !staff || staff.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="No staff yet"
              description="Assign a role to a user to give them admin access."
            />
          ) : (
            <Table>
              <THead>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Roles</Th>
                <Th />
              </THead>
              <tbody>
                {staff.map((s) => (
                  <Tr key={s.id}>
                    <Td className="font-medium text-ink">
                      {s.firstName} {s.lastName}
                    </Td>
                    <Td className="text-ink-dim">{s.email}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        {s.roles.map((role) => (
                          <span
                            key={role.id}
                            className="inline-flex items-center gap-1 rounded-full bg-base-surface2 px-2.5 py-1 text-xs font-medium text-ink-dim"
                          >
                            {role.name}
                            {role.name !== "admin" && (
                              <button
                                onClick={() =>
                                  setRemoving({ userId: s.id, roleId: role.id })
                                }
                                className="text-ink-faint hover:text-danger"
                                aria-label={`Remove ${role.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    </Td>
                    <Td />
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <CreateRoleModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refreshAll}
      />
      <EditPermissionsModal
        role={editingRole}
        onClose={() => setEditingRole(null)}
        onSaved={refreshAll}
      />
      <AssignStaffModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssigned={refreshAll}
      />
      <ConfirmDialog
        open={!!deletingRole}
        onClose={() => setDeletingRole(null)}
        onConfirm={onConfirmDelete}
        title="Delete role"
        description={`Delete the "${deletingRole?.name}" role? This can't be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleting}
      />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={onUnassign}
        title="Remove role"
        description="Remove this role from the staff member?"
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
