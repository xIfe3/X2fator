"use client";

import { useState } from "react";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Select } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/utils";

export default function AdminSupportPage() {
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const { data: tickets, isLoading } = useApiQuery(
    () =>
      adminApi.support.tickets({
        status: status || undefined,
        priority: priority || undefined,
      }),
    [status, priority],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Support tickets
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          {tickets?.length ?? 0} tickets matching the current filters.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
          <Select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !tickets || tickets.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="No tickets"
              description="No support tickets match this filter."
            />
          ) : (
            <Table>
              <THead>
                <Th>Subject</Th>
                <Th>Requester</Th>
                <Th>Priority</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
              </THead>
              <tbody>
                {tickets.map((t) => (
                  <Tr key={t.id}>
                    <Td>
                      <Link
                        href={`/admin/support/${t.id}`}
                        className="font-medium text-ink hover:text-primary hover:underline"
                      >
                        {t.subject}
                      </Link>
                    </Td>
                    <Td className="text-xs">
                      <p className="font-medium text-ink">
                        {t.requesterFirstName} {t.requesterLastName}
                      </p>
                      <p className="text-ink-faint">{t.requesterEmail}</p>
                    </Td>
                    <Td className="capitalize text-ink-dim">{t.priority}</Td>
                    <Td>
                      <StatusPill status={t.status} />
                    </Td>
                    <Td className="text-ink-dim">
                      {formatDateTime(t.updatedAt ?? t.createdAt)}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
