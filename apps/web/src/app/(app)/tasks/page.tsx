"use client";

import { FormEvent, useState } from "react";
import { ListChecks } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { tasksApi } from "@/lib/api/tasks";
import type { Task } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default function TasksPage() {
  const [tab, setTab] = useState<"browse" | "completions">("browse");
  const { data: tasks, isLoading: tasksLoading } = useApiQuery(() => tasksApi.list());
  const { data: completions, isLoading: completionsLoading, refetch: refetchCompletions } = useApiQuery(() =>
    tasksApi.myCompletions(),
  );

  const [selected, setSelected] = useState<Task | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    try {
      await tasksApi.complete(selected.id, { screenshotUrl: screenshotUrl || undefined });
      push("success", "Task submitted for review.");
      setSelected(null);
      setScreenshotUrl("");
      refetchCompletions();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not submit task.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Tasks</h1>
          <p className="mt-1 text-sm text-ink-dim">Complete tasks to earn into your earnings wallet.</p>
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
              <EmptyState icon={ListChecks} title="No tasks available" description="Check back later for new tasks." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {tasks.map((t) => (
                  <div key={t.id} className="rounded-xl border border-base-border bg-base-raised p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-medium text-ink">{t.title}</h3>
                      <span className="shrink-0 font-mono text-sm font-semibold tabular text-mint">
                        {formatMoney(t.reward)}
                      </span>
                    </div>
                    {t.description && <p className="mt-1.5 text-xs text-ink-dim">{t.description}</p>}
                    <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={() => setSelected(t)}>
                      Complete task
                    </Button>
                  </div>
                ))}
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
              <EmptyState icon={ListChecks} title="No submissions yet" description="Complete a task to see it here." />
            ) : (
              <Table>
                <THead>
                  <Th>Submitted</Th>
                  <Th>Status</Th>
                </THead>
                <tbody>
                  {completions.map((c) => (
                    <Tr key={c.id}>
                      <Td className="text-ink-dim">{formatDateTime(c.createdAt)}</Td>
                      <Td>
                        <StatusPill status={c.status} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Complete: ${selected?.title ?? ""}`}>
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-ink-dim">
            Reward:{" "}
            <span className="font-mono font-semibold text-mint">{formatMoney(selected?.reward)}</span>
          </p>
          <Input
            label="Proof screenshot URL (optional)"
            type="url"
            value={screenshotUrl}
            onChange={(e) => setScreenshotUrl(e.target.value)}
            placeholder="https://..."
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" isLoading={submitting}>
            Submit for review
          </Button>
        </form>
      </Modal>
    </div>
  );
}
