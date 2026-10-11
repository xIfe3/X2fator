"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, ImageIcon, Lightbulb, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useAuth } from "@/lib/auth-context";
import { adminApi } from "@/lib/api/admin";
import type { Task } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { Money } from "@/components/ui/Money";
import { Badge } from "@/components/ui/Badge";

interface TaskFormState {
  title: string;
  description: string;
  reward: string;
  durationSeconds: string;
  status: "active" | "inactive";
  taskType: "video" | "app" | "other";
  targetUrl: string;
}

const emptyForm: TaskFormState = {
  title: "",
  description: "",
  reward: "",
  durationSeconds: "",
  status: "active",
  taskType: "video",
  targetUrl: "",
};

// Per-admin flag: once an admin dismisses the recycle tip it stays hidden
// for their account on this browser.
const RECYCLE_TIP_KEY = "2xf_recycle_tip_dismissed";

function formatDuration(seconds?: number) {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

export default function AdminTasksPage() {
  const { hasPermission, user } = useAuth();
  const canReview = hasPermission("tasks.review");
  const { data: tasks, isLoading, refetch } = useApiQuery(() => adminApi.tasks.all());
  const { push } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [recycleTarget, setRecycleTarget] = useState<Task | null>(null);
  const [recycling, setRecycling] = useState(false);
  const [bulkRecycleOpen, setBulkRecycleOpen] = useState(false);
  const [bulkRecycling, setBulkRecycling] = useState(false);
  const [showRecycleTip, setShowRecycleTip] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      setShowRecycleTip(
        window.localStorage.getItem(`${RECYCLE_TIP_KEY}:${user.id}`) !== "1",
      );
    } catch {
      setShowRecycleTip(true);
    }
  }, [user]);

  function dismissRecycleTip() {
    setShowRecycleTip(false);
    if (!user) return;
    try {
      window.localStorage.setItem(`${RECYCLE_TIP_KEY}:${user.id}`, "1");
    } catch {
      // Storage unavailable — the tip just reappears next visit.
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      reward: task.reward,
      durationSeconds: task.durationSeconds != null ? String(task.durationSeconds) : "",
      status: task.status ?? "active",
      taskType: task.taskType ?? "video",
      targetUrl: task.targetUrl ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim() || !form.reward.trim()) {
      setError("Title and reward are required.");
      return;
    }

    const dto = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      reward: form.reward.trim(),
      durationSeconds: form.durationSeconds.trim() ? Number(form.durationSeconds) : undefined,
      taskType: form.taskType,
      targetUrl: form.targetUrl.trim() || undefined,
      ...(editing ? { status: form.status } : {}),
    };

    setSaving(true);
    try {
      if (editing) {
        await adminApi.tasks.update(editing.id, dto);
        push("success", "Task updated.");
      } else {
        await adminApi.tasks.create(dto);
        push("success", "Task created.");
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not save this task.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(task: Task) {
    try {
      await adminApi.tasks.update(task.id, { status: task.status === "active" ? "inactive" : "active" });
      push("success", task.status === "active" ? "Task deactivated." : "Task activated.");
      refetch();
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not update this task.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.tasks.remove(deleteTarget.id);
      push("success", "Task deleted.");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError ? err.message : "Could not delete this task.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function confirmRecycle() {
    if (!recycleTarget) return;
    setRecycling(true);
    try {
      await adminApi.tasks.recycle(recycleTarget.id);
      push("success", "Task recycled — a fresh copy is now live for all users.");
      setRecycleTarget(null);
      refetch();
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not recycle this task.");
    } finally {
      setRecycling(false);
    }
  }

  async function confirmBulkRecycle() {
    if (selected.size === 0) return;
    setBulkRecycling(true);
    try {
      const { recycled, skipped } = await adminApi.tasks.bulkRecycle([...selected]);
      if (recycled.length > 0) {
        push(
          "success",
          `Recycled ${recycled.length} task${recycled.length === 1 ? "" : "s"}.`,
        );
      }
      if (skipped.length > 0) {
        push(
          "error",
          `${skipped.length} task${skipped.length === 1 ? "" : "s"} couldn't be recycled (ad campaign tasks can't be recycled).`,
        );
      }
      setSelected(new Set());
      setBulkRecycleOpen(false);
      refetch();
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not recycle these tasks.");
    } finally {
      setBulkRecycling(false);
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!tasks) return;
    setSelected((prev) =>
      prev.size === tasks.length ? new Set() : new Set(tasks.map((t) => t.id)),
    );
  }

  async function confirmBulkDelete() {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    try {
      const { deleted, skipped } = await adminApi.tasks.bulkRemove([...selected]);
      if (deleted.length > 0) {
        push(
          "success",
          `Deleted ${deleted.length} task${deleted.length === 1 ? "" : "s"}.`,
        );
      }
      if (skipped.length > 0) {
        push(
          "error",
          `${skipped.length} task${skipped.length === 1 ? "" : "s"} couldn't be deleted (has completion history) — deactivate instead.`,
        );
      }
      setSelected(new Set());
      setBulkConfirmOpen(false);
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError ? err.message : "Could not delete these tasks.",
      );
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Tasks</h1>
          <p className="mt-1 text-sm text-ink-dim">{tasks?.length ?? 0} tasks configured.</p>
        </div>
        <div className="flex gap-2">
          {canReview && (
            <Link href="/admin/tasks/submissions">
              <Button size="sm" variant="secondary">
                <ImageIcon className="h-4 w-4" /> Review submissions
              </Button>
            </Link>
          )}
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New task
          </Button>
        </div>
      </div>

      {showRecycleTip && (
        <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info-soft px-4 py-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <div className="flex-1 text-sm text-ink">
            <p className="font-medium">Tip: recycle tasks instead of recreating them</p>
            <p className="mt-1 text-ink-dim">
              <RefreshCw className="inline h-3.5 w-3.5" /> <strong>Recycle</strong> creates a fresh copy of a task that
              every user can complete again. The <strong>original task is disabled</strong> (set to inactive) but keeps
              its submission history. <strong>Ad campaign tasks can&apos;t be recycled.</strong>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" variant="ghost" onClick={dismissRecycleTip}>
              Got it
            </Button>
            <button
              type="button"
              onClick={dismissRecycleTip}
              aria-label="Dismiss tip"
              className="rounded-lg p-1 text-ink-faint hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3">
          <p className="text-sm font-medium text-danger">
            {selected.size} task{selected.size === 1 ? "" : "s"} selected
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setBulkRecycleOpen(true)}>
              <RefreshCw className="h-3.5 w-3.5" /> Recycle selected
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setBulkConfirmOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete selected
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All tasks</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !tasks || tasks.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No tasks yet"
              description="Create the first task for users to complete."
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> New task
                </Button>
              }
            />
          ) : (
            <Table>
              <THead>
                <Th className="w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === tasks.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all tasks"
                    className="h-4 w-4 rounded border-base-border text-primary focus:ring-primary"
                  />
                </Th>
                <Th>Title</Th>
                <Th className="text-right">Reward</Th>
                <Th className="text-right">Duration</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </THead>
              <tbody>
                {tasks.map((t) => (
                  <Tr key={t.id}>
                    <Td>
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => toggleSelected(t.id)}
                        aria-label={`Select ${t.title}`}
                        className="h-4 w-4 rounded border-base-border text-primary focus:ring-primary"
                      />
                    </Td>
                    <Td>
                      <p className="font-medium text-ink">{t.title}</p>
                      {t.description && <p className="mt-0.5 text-xs text-ink-faint">{t.description}</p>}
                      {t.adId && (
                        <Badge tone="info" className="mt-1">
                          Ad campaign · can&apos;t be recycled
                        </Badge>
                      )}
                    </Td>
                    <Td className="text-right"><Money value={t.reward} size="sm" /></Td>
                    <Td className="text-right text-ink-dim">{formatDuration(t.durationSeconds)}</Td>
                    <Td>
                      <StatusPill status={t.status} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <span title={t.adId ? "Ad campaign tasks can't be recycled" : undefined}>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!!t.adId}
                            onClick={() => setRecycleTarget(t)}
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Recycle
                          </Button>
                        </span>
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(t)}>
                          {t.status === "active" ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleteTarget(t)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit task" : "New task"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Watch a sponsored video"
          />
          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Reward"
              value={form.reward}
              onChange={(e) => setForm((f) => ({ ...f, reward: e.target.value }))}
              placeholder="100"
              inputMode="decimal"
            />
            <Input
              label="Duration (seconds)"
              value={form.durationSeconds}
              onChange={(e) => setForm((f) => ({ ...f, durationSeconds: e.target.value }))}
              placeholder="30"
              inputMode="numeric"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Task type"
              value={form.taskType}
              onChange={(e) => setForm((f) => ({ ...f, taskType: e.target.value as TaskFormState["taskType"] }))}
            >
              <option value="video">Watch a video</option>
              <option value="app">Download an app</option>
              <option value="other">Other link</option>
            </Select>
            <Input
              label="Link"
              value={form.targetUrl}
              onChange={(e) => setForm((f) => ({ ...f, targetUrl: e.target.value }))}
              placeholder="https://..."
              hint="Video URL or app store link"
            />
          </div>
          {editing && (
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskFormState["status"] }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          )}
          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" isLoading={saving}>
            {editing ? "Save changes" : "Create task"}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete task"
        description={`Permanently delete "${deleteTarget?.title ?? ""}"? This can't be undone. Tasks with completion history can't be deleted — deactivate them instead.`}
        confirmLabel="Delete task"
        variant="danger"
        isLoading={deleting}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Delete selected tasks"
        description={`Permanently delete ${selected.size} task${selected.size === 1 ? "" : "s"}? This can't be undone. Any with completion history will be skipped — deactivate those instead.`}
        confirmLabel="Delete selected"
        variant="danger"
        isLoading={bulkDeleting}
      />

      <ConfirmDialog
        open={!!recycleTarget}
        onClose={() => setRecycleTarget(null)}
        onConfirm={confirmRecycle}
        title="Recycle task"
        description={`Create a fresh copy of "${recycleTarget?.title ?? ""}" that every user can complete again — including those who already did it? Heads up: the original task will be disabled (set to inactive). Its submission history is kept.`}
        confirmLabel="Recycle task"
        isLoading={recycling}
      />

      <ConfirmDialog
        open={bulkRecycleOpen}
        onClose={() => setBulkRecycleOpen(false)}
        onConfirm={confirmBulkRecycle}
        title="Recycle selected tasks"
        description={`Create fresh copies of ${selected.size} task${selected.size === 1 ? "" : "s"} that every user can complete again? Heads up: the originals will be disabled (set to inactive) — their submission history is kept. Ad campaign tasks can't be recycled and will be skipped.`}
        confirmLabel="Recycle selected"
        isLoading={bulkRecycling}
      />
    </div>
  );
}
