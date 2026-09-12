"use client";

import { useState } from "react";
import { ImageIcon, ThumbsDown, ThumbsUp } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import type { TaskCompletion } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, resolveFileUrl } from "@/lib/utils";
import { Money } from "@/components/ui/Money";

export default function AdminTaskSubmissionsPage() {
  const { data: completions, isLoading, refetch } = useApiQuery(() => adminApi.tasks.pendingCompletions());
  const { push } = useToast();

  const [rejecting, setRejecting] = useState<TaskCompletion | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approve(c: TaskCompletion) {
    setBusyId(c.id);
    try {
      await adminApi.tasks.approveCompletion(c.id);
      push("success", "Approved. Reward credited to the user's earnings wallet.");
      refetch();
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not approve this submission.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    try {
      await adminApi.tasks.rejectCompletion(rejecting.id, note.trim() || undefined);
      push("success", "Submission rejected.");
      setRejecting(null);
      setNote("");
      refetch();
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not reject this submission.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Task submissions</h1>
        <p className="mt-1 text-sm text-ink-dim">
          {completions?.length ?? 0} screenshot{completions?.length === 1 ? "" : "s"} awaiting review.
        </p>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : !completions || completions.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState icon={ImageIcon} title="Nothing pending" description="All caught up — no submissions waiting on review." />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {completions.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <a href={resolveFileUrl(c.screenshotUrl)} target="_blank" rel="noreferrer" className="block bg-base-raised">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveFileUrl(c.screenshotUrl)} alt="Submission screenshot" className="h-48 w-full object-cover" />
              </a>
              <CardBody className="space-y-3">
                <div>
                  <p className="font-medium text-ink">{c.task?.title ?? "Task"}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">{formatDateTime(c.completedAt ?? c.createdAt)}</p>
                </div>
                <Money value={c.reward ?? c.task?.reward} size="sm" tone="primary" />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" isLoading={busyId === c.id} onClick={() => approve(c)}>
                    <ThumbsUp className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    className="flex-1"
                    onClick={() => {
                      setRejecting(c);
                      setNote("");
                    }}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject submission">
        <div className="space-y-4">
          <p className="text-sm text-ink-dim">
            Reject <span className="font-medium text-ink">{rejecting?.task?.title}</span>? No reward will be credited.
          </p>
          <Textarea label="Note (optional)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is this being rejected?" />
          <Button variant="danger" className="w-full" isLoading={busyId === rejecting?.id} onClick={confirmReject}>
            Confirm reject
          </Button>
        </div>
      </Modal>
    </div>
  );
}
