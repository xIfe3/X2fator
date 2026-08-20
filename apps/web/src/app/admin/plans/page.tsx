"use client";

import { FormEvent, useState } from "react";
import { LineChart, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import type { Plan } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/utils";

interface PlanFormState {
  name: string;
  description: string;
  price: string;
  durationDays: string;
  dailyTaskLimit: string;
  dailyReward: string;
  referralRewardRate: string;
  minimumWithdrawal: string;
  status: "draft" | "active" | "inactive";
  isFeatured: boolean;
}

const emptyForm: PlanFormState = {
  name: "",
  description: "",
  price: "",
  durationDays: "",
  dailyTaskLimit: "",
  dailyReward: "",
  referralRewardRate: "",
  minimumWithdrawal: "",
  status: "draft",
  isFeatured: false,
};

export default function AdminPlansPage() {
  const { data: plans, isLoading, refetch } = useApiQuery(() => adminApi.plans.all());
  const { push } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      price: plan.price,
      durationDays: String(plan.durationDays ?? ""),
      dailyTaskLimit: plan.dailyTaskLimit != null ? String(plan.dailyTaskLimit) : "",
      dailyReward: plan.dailyReward ?? "",
      referralRewardRate: plan.referralRewardRate ?? "",
      minimumWithdrawal: plan.minimumWithdrawal ?? "",
      status: plan.status ?? "draft",
      isFeatured: !!plan.isFeatured,
    });
    setError(null);
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.price.trim() || !form.durationDays.trim()) {
      setError("Name, price, and duration are required.");
      return;
    }

    const dto = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: form.price.trim(),
      durationDays: Number(form.durationDays),
      dailyTaskLimit: form.dailyTaskLimit.trim() ? Number(form.dailyTaskLimit) : undefined,
      dailyReward: form.dailyReward.trim() || undefined,
      referralRewardRate: form.referralRewardRate.trim() || undefined,
      minimumWithdrawal: form.minimumWithdrawal.trim() || undefined,
      status: form.status,
      isFeatured: form.isFeatured,
    };

    setSaving(true);
    try {
      if (editing) {
        await adminApi.plans.update(editing.id, dto);
        push("success", "Plan updated.");
      } else {
        await adminApi.plans.create(dto);
        push("success", "Plan created.");
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not save this plan.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.plans.remove(deleteTarget.id);
      push("success", "Plan deleted.");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not delete this plan.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Plans</h1>
          <p className="mt-1 text-sm text-ink-dim">{plans?.length ?? 0} plans configured.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All plans</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !plans || plans.length === 0 ? (
            <EmptyState
              icon={LineChart}
              title="No plans yet"
              description="Create your first subscription plan."
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> New plan
                </Button>
              }
            />
          ) : (
            <Table>
              <THead>
                <Th>Name</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">Daily reward</Th>
                <Th className="text-right">Duration</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </THead>
              <tbody>
                {plans.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <div className="flex items-center gap-1.5 font-medium text-ink">
                        {p.isFeatured && <Star className="h-3.5 w-3.5 fill-amber text-amber" />}
                        {p.name}
                      </div>
                      {p.description && <p className="mt-0.5 text-xs text-ink-faint">{p.description}</p>}
                    </Td>
                    <Td className="text-right font-mono tabular text-ink">{formatMoney(p.price)}</Td>
                    <Td className="text-right font-mono tabular text-ink-dim">
                      {p.dailyReward ? formatMoney(p.dailyReward) : "—"}
                    </Td>
                    <Td className="text-right text-ink-dim">{p.durationDays} days</Td>
                    <Td>
                      <StatusPill status={p.status} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(p)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit plan" : "New plan"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Starter"
          />
          <Textarea
            label="Description"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="5000"
              inputMode="decimal"
            />
            <Input
              label="Duration (days)"
              value={form.durationDays}
              onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
              placeholder="30"
              inputMode="numeric"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Daily reward"
              value={form.dailyReward}
              onChange={(e) => setForm((f) => ({ ...f, dailyReward: e.target.value }))}
              placeholder="250"
              inputMode="decimal"
            />
            <Input
              label="Daily task limit"
              value={form.dailyTaskLimit}
              onChange={(e) => setForm((f) => ({ ...f, dailyTaskLimit: e.target.value }))}
              placeholder="5"
              inputMode="numeric"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Referral reward rate"
              value={form.referralRewardRate}
              onChange={(e) => setForm((f) => ({ ...f, referralRewardRate: e.target.value }))}
              placeholder="0.1"
              hint="Fraction, e.g. 0.1 = 10%"
            />
            <Input
              label="Minimum withdrawal"
              value={form.minimumWithdrawal}
              onChange={(e) => setForm((f) => ({ ...f, minimumWithdrawal: e.target.value }))}
              placeholder="1000"
              inputMode="decimal"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PlanFormState["status"] }))}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-ink-dim">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-base-border accent-mint"
                checked={form.isFeatured}
                onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
              />
              Featured plan
            </label>
          </div>
          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" isLoading={saving}>
            {editing ? "Save changes" : "Create plan"}
          </Button>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete plan">
        <div className="space-y-4">
          <p className="text-sm text-ink-dim">
            Delete <span className="font-medium text-ink">{deleteTarget?.name}</span>? This can&apos;t be undone.
          </p>
          <Button variant="danger" className="w-full" isLoading={deleting} onClick={confirmDelete}>
            Confirm delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
