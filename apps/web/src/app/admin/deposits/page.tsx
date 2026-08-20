"use client";

import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default function AdminDepositsPage() {
  const {
    data: deposits,
    isLoading,
    refetch,
  } = useApiQuery(() => adminApi.deposits.all());

  async function review(id: string, action: "approve" | "reject") {
    await adminApi.deposits.review(id, { action });
    refetch();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposits</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <p className="text-sm text-ink-dim">Loading deposits...</p>
        ) : (
          <Table>
            <THead>
              <Th>Reference</Th>
              <Th>User</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th className="text-right">Amount</Th>
              <Th />
            </THead>
            <tbody>
              {deposits?.map((deposit) => (
                <Tr key={deposit.id}>
                  <Td className="font-mono text-xs">{deposit.reference}</Td>
                  <Td className="font-mono text-xs text-ink-dim">
                    {deposit.userId}
                  </Td>
                  <Td className="text-ink-dim">
                    {formatDateTime(deposit.createdAt)}
                  </Td>
                  <Td>
                    <StatusPill status={deposit.status} />
                  </Td>
                  <Td className="text-right font-mono">
                    {formatMoney(deposit.amount)}
                  </Td>
                  <Td className="text-right">
                    {deposit.status === "pending" && (
                      <span className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => review(deposit.id, "approve")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => review(deposit.id, "reject")}
                        >
                          Reject
                        </Button>
                      </span>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}
