"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api-client";
import { cn, formatDateTime } from "@/lib/utils";

export default function AdminTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { push } = useToast();

  const {
    data: ticket,
    isLoading,
    refetch,
  } = useApiQuery(() => adminApi.support.ticket(params.id), [params.id]);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [prioritySaving, setPrioritySaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await adminApi.support.reply(params.id, message);
      setMessage("");
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError ? err.message : "Could not send reply.",
      );
    } finally {
      setSending(false);
    }
  }

  async function changePriority(priority: string) {
    setPrioritySaving(true);
    try {
      await adminApi.support.setPriority(
        params.id,
        priority as "low" | "medium" | "high" | "urgent",
      );
      push("success", "Priority updated.");
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError ? err.message : "Could not update priority.",
      );
    } finally {
      setPrioritySaving(false);
    }
  }

  async function toggleAssignToMe() {
    if (!user) return;
    setAssigning(true);
    try {
      const alreadyMine = ticket?.assignedTo === user.id;
      await adminApi.support.assign(params.id, alreadyMine ? null : user.id);
      push("success", alreadyMine ? "Unassigned." : "Assigned to you.");
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError ? err.message : "Could not update assignment.",
      );
    } finally {
      setAssigning(false);
    }
  }

  async function resolve() {
    setResolving(true);
    try {
      await adminApi.support.resolve(params.id);
      push("success", "Ticket marked resolved.");
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError ? err.message : "Could not resolve ticket.",
      );
    } finally {
      setResolving(false);
    }
  }

  async function close() {
    setClosing(true);
    try {
      await adminApi.support.close(params.id);
      push("success", "Ticket closed.");
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError ? err.message : "Could not close ticket.",
      );
    } finally {
      setClosing(false);
    }
  }

  if (isLoading) return <PageSkeleton />;

  const finalized = ticket?.status === "closed";

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/admin/support")}
        className="flex items-center gap-1.5 text-sm text-ink-dim hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </button>

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">
            {ticket?.subject}
          </h1>
          <p className="mt-1 text-xs text-ink-faint">
            {ticket?.requester?.name} · {ticket?.requester?.email}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <StatusPill status={ticket?.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={ticket?.assignedTo === user?.id ? "secondary" : "outline"}
            size="sm"
            onClick={toggleAssignToMe}
            isLoading={assigning}
            disabled={finalized}
          >
            {ticket?.assignedTo === user?.id
              ? "Assigned to you"
              : ticket?.assignedTo
                ? "Reassign to me"
                : "Assign to me"}
          </Button>
          <Select
            value={ticket?.priority}
            onChange={(e) => changePriority(e.target.value)}
            disabled={prioritySaving || finalized}
            aria-label="Priority"
          >
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
            <option value="urgent">Urgent priority</option>
          </Select>
          {ticket?.status !== "resolved" && !finalized && (
            <Button
              variant="secondary"
              size="sm"
              onClick={resolve}
              isLoading={resolving}
            >
              Mark resolved
            </Button>
          )}
          {!finalized && (
            <Button
              variant="outline"
              size="sm"
              onClick={close}
              isLoading={closing}
            >
              Close ticket
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {!ticket?.messages || ticket.messages.length === 0 ? (
            <p className="text-sm text-ink-faint">No messages yet.</p>
          ) : (
            ticket.messages.map((m) => {
              const isStaff = m.senderId !== ticket.userId;
              return (
                <div
                  key={m.id}
                  className={cn("flex", isStaff ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-xl border px-4 py-3 text-sm",
                      isStaff
                        ? "border-primary-dim/40 bg-primary-soft text-ink"
                        : "border-base-border bg-base-raised text-ink",
                    )}
                  >
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                      {isStaff ? "Support" : ticket.requester?.name ?? "User"}
                    </p>
                    <p>{m.message}</p>
                    <p className="mt-1.5 text-[11px] text-ink-faint">
                      {formatDateTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </CardBody>
      </Card>

      {!finalized && (
        <form onSubmit={onSubmit} className="flex items-end gap-3">
          <div className="flex-1">
            <Textarea
              rows={2}
              placeholder="Reply to this ticket…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <Button type="submit" isLoading={sending}>
            <Send className="h-4 w-4" /> Send
          </Button>
        </form>
      )}
    </div>
  );
}
