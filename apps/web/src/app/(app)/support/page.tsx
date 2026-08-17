"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LifeBuoy, Plus } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { supportApi } from "@/lib/api/support";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils";

export default function SupportPage() {
  const { data: tickets, isLoading, refetch } = useApiQuery(() => supportApi.myTickets());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "", priority: "medium" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await supportApi.createTicket(form);
      push("success", "Ticket created. We'll respond soon.");
      setOpen(false);
      setForm({ subject: "", message: "", priority: "medium" });
      refetch();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not create ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Support</h1>
          <p className="mt-1 text-sm text-ink-dim">Get help from the 2xFactor team.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New ticket
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My tickets</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !tickets || tickets.length === 0 ? (
            <EmptyState icon={LifeBuoy} title="No tickets yet" description="Open a ticket if something needs attention." />
          ) : (
            <Table>
              <THead>
                <Th>Subject</Th>
                <Th>Priority</Th>
                <Th>Opened</Th>
                <Th>Status</Th>
              </THead>
              <tbody>
                {tickets.map((t) => (
                  <Tr key={t.id} className="cursor-pointer">
                    <Td>
                      <Link href={`/support/${t.id}`} className="hover:text-mint">
                        {t.subject}
                      </Link>
                    </Td>
                    <Td className="capitalize text-ink-dim">{t.priority ?? "—"}</Td>
                    <Td className="text-ink-dim">{formatDateTime(t.createdAt)}</Td>
                    <Td>
                      <StatusPill status={t.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New support ticket">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Subject"
            required
            minLength={3}
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          />
          <Select
            label="Priority"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
          <Textarea
            label="Message"
            required
            rows={4}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" isLoading={submitting}>
            Open ticket
          </Button>
        </form>
      </Modal>
    </div>
  );
}
