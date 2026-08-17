"use client";

import { FormEvent, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { kycApi } from "@/lib/api/kyc";
import type { KycDocumentType } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

const documentLabels: Record<KycDocumentType, string> = {
  national_id: "National ID",
  drivers_license: "Driver's license",
  passport: "International passport",
  voters_card: "Voter's card",
};

export default function KycPage() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useApiQuery(() => kycApi.status());
  const { data: documents, isLoading, refetch } = useApiQuery(() => kycApi.myDocuments());

  const [form, setForm] = useState<{ documentType: KycDocumentType; documentNumber: string; documentUrl: string }>({
    documentType: "national_id",
    documentNumber: "",
    documentUrl: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await kycApi.submit({
        documentType: form.documentType,
        documentNumber: form.documentNumber || undefined,
        documentUrl: form.documentUrl,
      });
      push("success", "Document submitted for review.");
      setForm({ documentType: "national_id", documentNumber: "", documentUrl: "" });
      refetch();
      refetchStatus();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not submit document.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !statusLoading && status?.status !== "approved" && status?.status !== "pending";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">KYC verification</h1>
        <p className="mt-1 text-sm text-ink-dim">Verify your identity to unlock withdrawals.</p>
      </div>

      <Card>
        <CardBody className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-mint" />
          <div>
            <p className="text-sm font-medium text-ink">Current status</p>
            <div className="mt-1">
              {statusLoading ? (
                <span className="text-xs text-ink-faint">Loading…</span>
              ) : (
                <StatusPill status={status?.status ?? "unsubmitted"} />
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {canSubmit && (
        <Card>
          <CardHeader>
            <CardTitle>Submit a document</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={onSubmit} className="space-y-4">
              <Select
                label="Document type"
                value={form.documentType}
                onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value as KycDocumentType }))}
              >
                {Object.entries(documentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input
                label="Document number (optional)"
                value={form.documentNumber}
                onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))}
              />
              <Input
                label="Document image URL"
                type="url"
                required
                value={form.documentUrl}
                onChange={(e) => setForm((f) => ({ ...f, documentUrl: e.target.value }))}
                placeholder="https://..."
                hint="Upload the scan/photo somewhere first and paste the link here."
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" isLoading={submitting}>
                Submit for review
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Submitted documents</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !documents || documents.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No documents submitted" />
          ) : (
            <Table>
              <THead>
                <Th>Type</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
                <Th>Note</Th>
              </THead>
              <tbody>
                {documents.map((d) => (
                  <Tr key={d.id}>
                    <Td>{documentLabels[d.documentType]}</Td>
                    <Td className="text-ink-dim">{formatDate(d.createdAt)}</Td>
                    <Td>
                      <StatusPill status={d.status} />
                    </Td>
                    <Td className="text-ink-dim">{d.reviewNote || "—"}</Td>
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
