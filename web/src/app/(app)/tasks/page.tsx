"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  ListChecks,
  Lock,
  Play,
  Smartphone,
} from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { tasksApi } from "@/lib/api/tasks";
import { subscriptionsApi } from "@/lib/api/plans";
import { uploadsApi } from "@/lib/api/uploads";
import type { Task, TaskCompletion } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { StatusPill } from "@/components/ui/StatusPill";
import { Badge } from "@/components/ui/Badge";
import { Money } from "@/components/ui/Money";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DetailList } from "@/components/ui/DetailList";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { cn, formatDateTime } from "@/lib/utils";

const TASK_TYPE_META: Record<string, { label: string; icon: typeof Play }> = {
  video: { label: "Watch video", icon: Play },
  app: { label: "Get the app", icon: Smartphone },
  other: { label: "Open link", icon: ExternalLink },
};

export default function TasksPage() {
  const [tab, setTab] = useState<"browse" | "completions">("browse");
  const { data: subscription, isLoading: subscriptionLoading } = useApiQuery(
    () => subscriptionsApi.active(),
  );
  const {
    data: tasks,
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useApiQuery(() => tasksApi.list());
  const { data: today, refetch: refetchToday } = useApiQuery(() =>
    tasksApi.today(),
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
  const [selectedCompletion, setSelectedCompletion] =
    useState<TaskCompletion | null>(null);
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
      refetchToday();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Could not submit task.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const hasPlan = !!subscription;

  // Today's count comes from the server so it uses the same day boundary
  // as the submit-time limit check. Every submission counts — pending,
  // approved or rejected — so once the limit is hit there's nothing left
  // to do today and the task list is replaced by a countdown.
  const todayCompletionsCount = today?.completedToday ?? 0;
  const dailyLimitReached = hasPlan && !!today?.limitReached;

  function onDayReset() {
    refetchToday();
    refetchTasks();
    refetchCompletions();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Tasks
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Complete tasks to earn into your earnings wallet.
        </p>
      </div>

      {subscriptionLoading ? (
        <PageSkeleton />
      ) : !hasPlan ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Lock}
              title="No tasks for you until you purchase a plan"
              description="Every plan comes with a daily task allowance — the higher the plan, the more tasks you can complete (and earn from) each day."
              action={
                <Link href="/plans">
                  <Button size="sm">
                    View plans <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <>
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs",
              dailyLimitReached
                ? "border-secondary-dim/40 bg-secondary-soft text-secondary"
                : "border-primary-dim/30 bg-primary-soft text-primary",
            )}
          >
            <ListChecks className="h-4 w-4 shrink-0" />
            {dailyLimitReached ? (
              <span>
                You've completed{" "}
                <span className="font-semibold">
                  {todayCompletionsCount}/{subscription.dailyTaskLimit}
                </span>{" "}
                tasks today — that's your limit on the{" "}
                <span className="font-semibold">{subscription.plan?.name ?? "plan"}</span>{" "}
                plan.
              </span>
            ) : (
              <span>
                Your <span className="font-semibold">{subscription.plan?.name ?? "plan"}</span>{" "}
                lets you complete up to{" "}
                <span className="font-semibold">{subscription.dailyTaskLimit}</span>{" "}
                {subscription.dailyTaskLimit === 1 ? "task" : "tasks"} per day —{" "}
                <span className="font-semibold">
                  {todayCompletionsCount}/{subscription.dailyTaskLimit}
                </span>{" "}
                done today.
              </span>
            )}
          </div>

          <Tabs
            tabs={[
              { key: "browse", label: "Browse" },
              { key: "completions", label: "My submissions" },
            ]}
            active={tab}
            onChange={(k) => setTab(k as "browse" | "completions")}
          />

          {tab === "browse" ? (
        <Card>
          <CardHeader>
            <CardTitle>Available tasks</CardTitle>
          </CardHeader>
          <CardBody>
            {tasksLoading ? (
              <PageSkeleton />
            ) : dailyLimitReached && today ? (
              <DoneForToday resetsAt={today.resetsAt} onReset={onDayReset} />
            ) : !tasks || tasks.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No tasks available"
                description="Check back later for new tasks."
              />
            ) : (
              <div className="space-y-3">
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
                      className="rounded-xl border border-base-border bg-base-raised p-4 transition-colors hover:border-base-borderStrong"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="text-sm font-medium text-ink">
                            {t.title}
                          </h3>
                          {t.source === "ad" && (
                            <Badge tone="secondary">Sponsored</Badge>
                          )}
                        </div>
                        <Money
                          value={t.reward}
                          size="md"
                          tone="primary"
                          className="shrink-0"
                        />
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
                          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                        >
                          <Icon className="h-3.5 w-3.5" /> {meta.label}
                        </a>
                      )}
                      {completion?.status === "pending" ? (
                        <div className="mt-3 rounded-lg border border-secondary-dim/40 bg-secondary-soft px-3 py-2 text-center text-xs font-medium text-secondary">
                          Awaiting review
                        </div>
                      ) : completion?.status === "approved" ? (
                        <div className="mt-3 rounded-lg border border-primary-dim/40 bg-primary-soft px-3 py-2 text-center text-xs font-medium text-primary">
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
              <div className="space-y-2.5">
                {completions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCompletion(c)}
                    className="flex w-full items-center gap-4 rounded-xl border border-base-border bg-base-raised p-4 text-left transition-colors hover:border-base-borderStrong"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {c.task?.title ?? "—"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        {formatDateTime(c.completedAt ?? c.createdAt)}
                      </p>
                      {c.reviewNote && (
                        <p className="mt-1 text-xs text-ink-dim">
                          {c.reviewNote}
                        </p>
                      )}
                    </div>
                    <StatusPill status={c.status} />
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
        </>
      )}

      <BottomSheet
        open={!!selectedCompletion}
        onClose={() => setSelectedCompletion(null)}
        title="Submission details"
      >
        {selectedCompletion && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-base-surface2 px-4 py-3.5">
              <div>
                <p className="text-xs text-ink-faint">Reward</p>
                <Money
                  value={selectedCompletion.reward}
                  size="lg"
                  tone="primary"
                  className="mt-0.5"
                />
              </div>
              <StatusPill status={selectedCompletion.status} />
            </div>

            {selectedCompletion.screenshotUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedCompletion.screenshotUrl}
                alt="Submitted proof"
                className="max-h-56 w-full rounded-xl border border-base-border object-cover"
              />
            )}

            <DetailList
              rows={[
                { label: "Task", value: selectedCompletion.task?.title },
                {
                  label: "Submitted",
                  value: formatDateTime(
                    selectedCompletion.completedAt ??
                      selectedCompletion.createdAt ??
                      "",
                  ),
                },
                {
                  label: "Reviewed",
                  value: selectedCompletion.reviewedAt
                    ? formatDateTime(selectedCompletion.reviewedAt)
                    : undefined,
                },
                { label: "Review note", value: selectedCompletion.reviewNote },
              ]}
            />
          </div>
        )}
      </BottomSheet>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Complete: ${selected?.title ?? ""}`}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-ink-dim">
            Reward: <Money value={selected?.reward} tone="primary" />
          </p>
          {selected?.targetUrl && (
            <a
              href={selected.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-base-border bg-base-raised px-3.5 py-2.5 text-sm font-medium text-primary hover:bg-base-surface2"
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
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-base-border bg-base-raised px-4 py-8 text-ink-faint transition-colors hover:border-primary-dim/50 hover:text-primary"
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

function DoneForToday({
  resetsAt,
  onReset,
}: {
  resetsAt: string;
  onReset: () => void;
}) {
  const target = new Date(resetsAt).getTime();
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((target - Date.now()) / 1000)),
  );

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(id);
        onReset();
      }
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const h = Math.floor(secondsLeft / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((secondsLeft % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(secondsLeft % 60)
    .toString()
    .padStart(2, "0");

  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-ink">
        You've performed all your tasks for today
      </h3>
      <p className="mt-1 text-sm text-ink-dim">
        Come back tomorrow for new tasks. You can track your submissions in
        the My submissions tab.
      </p>
      <p className="mt-5 text-xs uppercase tracking-wide text-ink-faint">
        New tasks in
      </p>
      <p className="mt-1 font-mono tabular text-3xl font-semibold text-ink">
        {h}:{m}:{s}
      </p>
    </div>
  );
}
