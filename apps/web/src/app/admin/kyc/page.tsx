"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils";

const documentLabels: Record<string, string> = {
  national_id: "National ID",
  drivers_license: "Driver's license",
  passport: "International passport",
  voters_card: "Voter's card",
};

export default function AdminKycPage() {
  const { data: pending, isLoading, refetch } = useApiQuery(() => adminApi.kyc.pending());
  const { push } = useToast();
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await adminApi.kyc.approve(id);
      push("success", "Document approved.");
      refetch();
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not approve document.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject() {
    if (!rejectTarget) return;
    setBusyId(rejectTarget);
    try {
      await adminApi.kyc.reject(rejectTarget, rejectNote || undefined);
      push("success", "Document rejected.");
      setRejectTarget(null);
      setRejectNote("");
      refetch();
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not reject document.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">KYC review</h1>
        <p className="mt-1 text-sm text-ink-dim">{pending?.length ?? 0} documents awaiting review.</p>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : !pending || pending.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="All caught up" description="No pending KYC documents." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pending.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle>{documentLabels[d.documentType] ?? d.documentType}</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-xs text-ink-faint">Submitted {formatDateTime(d.createdAt)}</p>
                {d.documentNumber && (
                  <p className="text-sm text-ink-dim">
                    Doc #: <span className="font-mono text-ink">{d.documentNumber}</span>
                  </p>
                )}
                <a
                  href={d.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm text-mint hover:underline"
                >
                  View document
                </a>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" isLoading={busyId === d.id} onClick={() => approve(d.id)} className="flex-1">
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    className="flex-1"
                    onClick={() => setRejectTarget(d.id)}
                  >
                    Reject
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject document">
        <div className="space-y-4">
          <Textarea
            label="Reason (optional)"
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Why this document is being rejected"
          />
          <Button variant="danger" className="w-full" isLoading={busyId === rejectTarget} onClick={reject}>
            Confirm rejection
          </Button>
        </div>
      </Modal>
    </div>
  );
}
