"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { supportApi } from "@/lib/api/support";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api-client";
import { cn, formatDateTime } from "@/lib/utils";

export default function TicketThreadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { push } = useToast();

  const { data: ticket, isLoading: ticketLoading, refetch: refetchTicket } = useApiQuery(
    () => supportApi.ticket(params.id),
    [params.id],
  );
  const { data: messages, isLoading, refetch } = useApiQuery(() => supportApi.messages(params.id), [params.id]);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await supportApi.addMessage(params.id, message);
      setMessage("");
      refetch();
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function closeTicket() {
    setClosing(true);
    try {
      await supportApi.close(params.id);
      push("success", "Ticket closed.");
      refetchTicket();
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not close ticket.");
    } finally {
      setClosing(false);
    }
  }

  if (ticketLoading || isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/support")}
        className="flex items-center gap-1.5 text-sm text-ink-dim hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </button>

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">{ticket?.subject}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusPill status={ticket?.status} />
            {ticket?.priority && <span className="text-xs capitalize text-ink-faint">{ticket.priority} priority</span>}
          </div>
        </div>
        {ticket?.status !== "closed" && (
          <Button variant="outline" size="sm" onClick={closeTicket} isLoading={closing}>
            Close ticket
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {!messages || messages.length === 0 ? (
            <p className="text-sm text-ink-faint">No messages yet.</p>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === user?.id;
              return (
                <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-xl border px-4 py-3 text-sm",
                      isMe
                        ? "border-mint-dim/40 bg-mint-soft text-ink"
                        : "border-base-border bg-base-raised text-ink",
                    )}
                  >
                    <p>{m.message}</p>
                    <p className="mt-1.5 text-[11px] text-ink-faint">{formatDateTime(m.createdAt)}</p>
                  </div>
                </div>
              );
            })
          )}
        </CardBody>
      </Card>

      {ticket?.status !== "closed" && (
        <form onSubmit={onSubmit} className="flex items-end gap-3">
          <div className="flex-1">
            <Textarea
              rows={2}
              placeholder="Write a reply…"
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
