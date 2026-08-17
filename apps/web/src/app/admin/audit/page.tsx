"use client";

import { ScrollText } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/utils";

export default function AdminAuditPage() {
  const { data: logs, isLoading } = useApiQuery(() => adminApi.audit.logs());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Audit log</h1>
        <p className="mt-1 text-sm text-ink-dim">Every admin action, in order.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !logs || logs.length === 0 ? (
            <EmptyState icon={ScrollText} title="No audit entries yet" />
          ) : (
            <Table>
              <THead>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>Actor</Th>
                <Th>When</Th>
              </THead>
              <tbody>
                {logs.map((l) => (
                  <Tr key={l.id}>
                    <Td className="font-mono text-xs text-ink">{l.action}</Td>
                    <Td className="text-ink-dim">
                      {l.targetType ? `${l.targetType} · ${l.targetId?.slice(0, 8) ?? "—"}` : "—"}
                    </Td>
                    <Td className="font-mono text-xs text-ink-dim">{l.actorId?.slice(0, 8) ?? "—"}</Td>
                    <Td className="text-ink-dim">{formatDateTime(l.createdAt)}</Td>
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
