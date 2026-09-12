"use client";

import { ScrollText } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateTime } from "@/lib/utils";

export default function AdminAuditPage() {
  const { data: logs, isLoading } = useApiQuery(() => adminApi.audit.logs());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Every admin action, in order.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity ({logs?.length ?? 0})</CardTitle>
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
                <Th>Entity</Th>
                <Th>Details</Th>
                <Th>Actor</Th>
                <Th>When</Th>
              </THead>
              <tbody>
                {logs.map((l) => (
                  <Tr key={l.id}>
                    <Td>
                      <StatusPill status={l.action} />
                    </Td>
                    <Td className="text-ink-dim">
                      <span className="capitalize">{l.entityType}</span>
                      {l.entity?.name && (
                        <span className="ml-1 font-medium text-ink">
                          {l.entity.name}
                        </span>
                      )}
                      {l.entity?.email && (
                        <span className="block text-xs text-ink-faint">
                          {l.entity.email}
                        </span>
                      )}
                      {l.entity?.owner && (
                        <span className="block text-xs text-ink-faint">
                          Owner: {l.entity.owner}
                        </span>
                      )}
                    </Td>
                    <Td className="max-w-sm text-ink-dim">
                      <p>{l.description ?? "—"}</p>
                      {(l.entity?.amount ||
                        l.entity?.price ||
                        l.entity?.reward ||
                        l.entity?.status ||
                        l.entity?.reference) && (
                        <p className="mt-1 text-xs text-ink-faint">
                          {l.entity.amount && `Amount: ${l.entity.amount} `}
                          {l.entity.price && `Price: ${l.entity.price} `}
                          {l.entity.reward && `Reward: ${l.entity.reward} `}
                          {l.entity.status && `Status: ${l.entity.status} `}
                          {l.entity.reference && `Ref: ${l.entity.reference}`}
                        </p>
                      )}
                      {(l.oldValues || l.newValues) && (
                        <details className="mt-1 text-xs">
                          <summary className="cursor-pointer text-primary">
                            View changes
                          </summary>
                          <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap rounded-lg bg-base-raised p-2 font-mono text-[10px] text-ink-faint">
                            {JSON.stringify(
                              { old: l.oldValues, new: l.newValues },
                              null,
                              2,
                            )}
                          </pre>
                        </details>
                      )}
                    </Td>
                    <Td className="text-ink-dim">
                      <span className="font-medium text-ink">
                        {l.actor?.name ?? "System"}
                      </span>
                      {l.actor?.email && (
                        <span className="block text-xs text-ink-faint">
                          {l.actor.email}
                        </span>
                      )}
                    </Td>
                    <Td className="text-ink-dim">
                      {formatDateTime(l.createdAt)}
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
