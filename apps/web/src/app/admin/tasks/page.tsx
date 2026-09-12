"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ClipboardList, ImageIcon, Pencil, Plus } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import type { Task } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { Money } from "@/components/ui/Money";

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

function formatDuration(seconds?: number) {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

export default function AdminTasksPage() {
  const { data: tasks, isLoading, refetch } = useApiQuery(() => adminApi.tasks.all());
  const { push } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Tasks</h1>
          <p className="mt-1 text-sm text-ink-dim">{tasks?.length ?? 0} tasks configured.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/tasks/submissions">
            <Button size="sm" variant="secondary">
              <ImageIcon className="h-4 w-4" /> Review submissions
            </Button>
          </Link>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New task
          </Button>
        </div>
      </div>

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
                      <p className="font-medium text-ink">{t.title}</p>
                      {t.description && <p className="mt-0.5 text-xs text-ink-faint">{t.description}</p>}
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
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(t)}>
                          {t.status === "active" ? "Deactivate" : "Activate"}
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
    </div>
  );
}
