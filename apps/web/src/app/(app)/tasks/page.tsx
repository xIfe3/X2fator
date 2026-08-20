"use client";

import { FormEvent, useRef, useState } from "react";
import {
  ExternalLink,
  ImagePlus,
  ListChecks,
  Play,
  Smartphone,
} from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { tasksApi } from "@/lib/api/tasks";
import { uploadsApi } from "@/lib/api/uploads";
import type { Task } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatMoney } from "@/lib/utils";

const TASK_TYPE_META: Record<string, { label: string; icon: typeof Play }> = {
  video: { label: "Watch video", icon: Play },
  app: { label: "Get the app", icon: Smartphone },
  other: { label: "Open link", icon: ExternalLink },
};

export default function TasksPage() {
  const [tab, setTab] = useState<"browse" | "completions">("browse");
  const { data: tasks, isLoading: tasksLoading } = useApiQuery(() =>
    tasksApi.list(),
  );
  const {
    data: completions,
    isLoading: completionsLoading,
    refetch: refetchCompletions,
  } = useApiQuery(() => tasksApi.myCompletions());

  const [selected, setSelected] = useState<Task | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { push } = useToast();

  function openTask(t: Task) {
    setSelected(t);
    setFile(null);
    setPreview(null);
    setError(null);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!file) {
      setError("A screenshot proving you completed this task is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { url } = await uploadsApi.uploadImage(file);
      await tasksApi.complete(selected.id, { screenshotUrl: url });
      push("success", "Task submitted for review.");
      setSelected(null);
      setFile(null);
      setPreview(null);
      refetchCompletions();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Could not submit task.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            Complete tasks to earn into your earnings wallet.
          </p>
        </div>
        <Tabs
          tabs={[
            { key: "browse", label: "Browse" },
            { key: "completions", label: "My submissions" },
          ]}
          active={tab}
          onChange={(k) => setTab(k as "browse" | "completions")}
        />
      </div>

      {tab === "browse" ? (
        <Card>
          <CardHeader>
            <CardTitle>Available tasks</CardTitle>
          </CardHeader>
          <CardBody>
            {tasksLoading ? (
              <PageSkeleton />
            ) : !tasks || tasks.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No tasks available"
                description="Check back later for new tasks."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {tasks.map((t) => {
                  const meta = TASK_TYPE_META[t.taskType ?? "other"] ?? {
                    label: "Open link",
                    icon: ExternalLink,
                  };
                  const Icon = meta.icon;
                  const completion = completions?.find(
                    (item) => item.taskId === t.id,
                  );
                  return (
                    <div
                      key={t.id}
                      className="rounded-xl border border-base-border bg-base-raised p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-medium text-ink">
                          {t.title}
                        </h3>
                        <span className="shrink-0 font-mono text-sm font-semibold tabular text-mint">
                          {formatMoney(t.reward)}
                        </span>
                      </div>
                      {t.description && (
                        <p className="mt-1.5 text-xs text-ink-dim">
                          {t.description}
                        </p>
                      )}
                      {t.targetUrl && (
                        <a
                          href={t.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-mint hover:underline"
                        >
                          <Icon className="h-3.5 w-3.5" /> {meta.label}
                        </a>
                      )}
                      {completion?.status === "pending" ? (
                        <div className="mt-3 rounded-lg border border-amber-dim/40 bg-amber-soft px-3 py-2 text-center text-xs font-medium text-amber">
                          Awaiting review
                        </div>
                      ) : completion?.status === "approved" ? (
                        <div className="mt-3 rounded-lg border border-mint-dim/40 bg-mint-soft px-3 py-2 text-center text-xs font-medium text-mint">
                          Task approved
                        </div>
                      ) : completion?.status === "rejected" ? (
                        <div className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-center text-xs font-medium text-danger">
                          Submission rejected
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-3 w-full"
                          onClick={() => openTask(t)}
                        >
                          Submit proof
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>My submissions</CardTitle>
          </CardHeader>
          <CardBody>
            {completionsLoading ? (
              <PageSkeleton />
            ) : !completions || completions.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No submissions yet"
                description="Complete a task to see it here."
              />
            ) : (
              <Table>
                <THead>
                  <Th>Task</Th>
                  <Th>Submitted</Th>
                  <Th>Status</Th>
                  <Th>Note</Th>
                </THead>
                <tbody>
                  {completions.map((c) => (
                    <Tr key={c.id}>
                      <Td className="text-ink">{c.task?.title ?? "—"}</Td>
                      <Td className="text-ink-dim">
                        {formatDateTime(c.completedAt ?? c.createdAt)}
                      </Td>
                      <Td>
                        <StatusPill status={c.status} />
                      </Td>
                      <Td className="text-ink-faint">{c.reviewNote ?? "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Complete: ${selected?.title ?? ""}`}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-ink-dim">
            Reward:{" "}
            <span className="font-mono font-semibold text-mint">
              {formatMoney(selected?.reward)}
            </span>
          </p>
          {selected?.targetUrl && (
            <a
              href={selected.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-base-border bg-base-raised px-3.5 py-2.5 text-sm font-medium text-mint hover:bg-base-surface2"
            >
              {(() => {
                const Icon =
                  TASK_TYPE_META[selected.taskType ?? "other"]?.icon ??
                  ExternalLink;
                return <Icon className="h-4 w-4" />;
              })()}
              {TASK_TYPE_META[selected.taskType ?? "other"]?.label ??
                "Open link"}
            </a>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-dim">
              Proof screenshot
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onFileChange}
            />
            {preview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="block w-full overflow-hidden rounded-xl border border-base-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Screenshot preview"
                  className="max-h-56 w-full object-cover"
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-base-border bg-base-raised px-4 py-8 text-ink-faint transition-colors hover:border-mint-dim/50 hover:text-mint"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs font-medium">
                  Upload a screenshot showing you completed this task
                </span>
              </button>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" isLoading={submitting}>
            Submit for review
          </Button>
        </form>
      </Modal>
    </div>
  );
}
