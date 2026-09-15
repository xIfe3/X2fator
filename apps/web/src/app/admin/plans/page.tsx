"use client";

import { FormEvent, useState } from "react";
import { Award, Pencil, Plus, Trash2 } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import type { Plan } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { Money } from "@/components/ui/Money";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";

interface PlanFormState {
  name: string;
  description: string;
  price: string;
  rank: string;
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
  rank: "0",
  dailyTaskLimit: "0",
  dailyReward: "0",
  referralRewardRate: "0",
  minimumWithdrawal: "0",
  status: "draft",
  isFeatured: false,
};

export default function AdminPlansPage() {
  const { data: plans, isLoading, refetch } = useApiQuery(() =>
    adminApi.plans.all(),
  );
  const { push } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      rank: String(plan.rank),
      dailyTaskLimit: String(plan.dailyTaskLimit ?? 0),
      dailyReward: plan.dailyReward ?? "0",
      referralRewardRate: plan.referralRewardRate ?? "0",
      minimumWithdrawal: plan.minimumWithdrawal ?? "0",
      status: plan.status,
      isFeatured: plan.isFeatured ?? false,
    });
    setError(null);
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.price.trim()) {
      setError("Name and price are required.");
      return;
    }

    const dto = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: form.price.trim(),
      rank: Number(form.rank),
      dailyTaskLimit: Number(form.dailyTaskLimit),
      dailyReward: form.dailyReward.trim(),
      referralRewardRate: form.referralRewardRate.trim(),
      minimumWithdrawal: form.minimumWithdrawal.trim(),
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
      setError(
        err instanceof ApiRequestError ? err.message : "Could not save this plan.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(plan: Plan) {
    try {
      await adminApi.plans.remove(plan.id);
      push("success", "Plan deleted.");
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError ? err.message : "Could not delete this plan.",
      );
    }
  }

  const sortedPlans = [...(plans ?? [])].sort((a, b) => a.rank - b.rank);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Plans
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            {plans?.length ?? 0} plans configured. Rank controls upgrade
            ordering — users can only move to a higher rank.
          </p>
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
              icon={Award}
              title="No plans yet"
              description="Create the first plan for users to subscribe to."
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
                <Th className="text-right">Rank</Th>
                <Th className="text-right">Price</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </THead>
              <tbody>
                {sortedPlans.map((plan) => (
                  <Tr key={plan.id}>
                    <Td>
                      <p className="font-medium text-ink">{plan.name}</p>
                      {plan.description && (
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {plan.description}
                        </p>
                      )}
                    </Td>
                    <Td className="text-right text-ink-dim">{plan.rank}</Td>
                    <Td className="text-right">
                      <Money value={plan.price} size="sm" />
                    </Td>
                    <Td>
                      <StatusPill status={plan.status} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(plan)}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => remove(plan)}
                        >
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit plan" : "New plan"}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Silver"
          />
          <Textarea
            label="Description"
            rows={2}
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
          <Input
            label="Price"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="5000"
            inputMode="decimal"
          />
          <Input
            label="Rank"
            value={form.rank}
            onChange={(e) => setForm((f) => ({ ...f, rank: e.target.value }))}
            hint="Higher rank = better tier. Users can only ever upgrade to a higher rank."
            inputMode="numeric"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Daily task limit"
              value={form.dailyTaskLimit}
              onChange={(e) =>
                setForm((f) => ({ ...f, dailyTaskLimit: e.target.value }))
              }
              inputMode="numeric"
            />
            <Input
              label="Daily reward"
              value={form.dailyReward}
              onChange={(e) =>
                setForm((f) => ({ ...f, dailyReward: e.target.value }))
              }
              inputMode="decimal"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Referral rate (%)"
              value={form.referralRewardRate}
              onChange={(e) =>
                setForm((f) => ({ ...f, referralRewardRate: e.target.value }))
              }
              inputMode="decimal"
            />
            <Input
              label="Min. withdrawal"
              value={form.minimumWithdrawal}
              onChange={(e) =>
                setForm((f) => ({ ...f, minimumWithdrawal: e.target.value }))
              }
              inputMode="decimal"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Status"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as PlanFormState["status"],
                }))
              }
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Select
              label="Featured"
              value={form.isFeatured ? "yes" : "no"}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  isFeatured: e.target.value === "yes",
                }))
              }
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </Select>
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
    </div>
  );
}
