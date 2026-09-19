"use client";

import { FormEvent, useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { utilitiesApi } from "@/lib/api/utilities";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { Money } from "@/components/ui/Money";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatMoney } from "@/lib/utils";

const NETWORKS = ["mtn", "airtel", "glo", "9mobile"] as const;

export default function UtilitiesPage() {
  const { data: purchases, isLoading, refetch } = useApiQuery(() => utilitiesApi.myPurchases());
  const [form, setForm] = useState({
    type: "airtime" as "airtime" | "data",
    provider: "mtn" as (typeof NETWORKS)[number],
    phoneNumber: "",
    amount: "",
    productCode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  const { data: bundles, isLoading: bundlesLoading } = useApiQuery(
    () =>
      form.type === "data"
        ? utilitiesApi.dataBundles(form.provider)
        : Promise.resolve([]),
    [form.type, form.provider],
  );

  useEffect(() => {
    setForm((f) => ({ ...f, productCode: "", amount: "" }));
  }, [form.type, form.provider]);

  function selectBundle(itemCode: string) {
    const bundle = bundles?.find((b) => b.item_code === itemCode);
    setForm((f) => ({
      ...f,
      productCode: itemCode,
      amount: bundle?.amount ? String(bundle.amount) : f.amount,
    }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await utilitiesApi.purchase({
        type: form.type,
        provider: form.provider,
        phoneNumber: form.phoneNumber,
        amount: form.amount,
        productCode: form.type === "data" ? form.productCode : undefined,
      });
      window.dispatchEvent(new Event("wallet-updated"));
      push("success", "Purchase submitted.");
      setForm((f) => ({ ...f, amount: "", phoneNumber: "", productCode: "" }));
      refetch();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not complete purchase.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Utilities</h1>
        <p className="mt-1 text-sm text-ink-dim">Buy airtime and data from your account wallet.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New purchase</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as "airtime" | "data" }))
              }
            >
              <option value="airtime">Airtime</option>
              <option value="data">Data</option>
            </Select>
            <Select
              label="Network"
              value={form.provider}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  provider: e.target.value as (typeof NETWORKS)[number],
                }))
              }
            >
              {NETWORKS.map((n) => (
                <option key={n} value={n}>
                  {n === "9mobile" ? "9mobile" : n.toUpperCase()}
                </option>
              ))}
            </Select>
            <Input
              label="Phone number"
              required
              minLength={10}
              maxLength={20}
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
            />
            {form.type === "data" ? (
              <Select
                label="Bundle"
                required
                disabled={bundlesLoading}
                value={form.productCode}
                onChange={(e) => selectBundle(e.target.value)}
              >
                <option value="">
                  {bundlesLoading ? "Loading bundles…" : "Select a bundle"}
                </option>
                {bundles?.map((b) => (
                  <option key={b.item_code} value={b.item_code}>
                    {b.name}
                    {b.amount ? ` — ${formatMoney(b.amount)}` : ""}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                label="Amount (NGN)"
                type="number"
                min={1}
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            )}
            {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
            <Button
              type="submit"
              className="sm:col-span-2"
              isLoading={submitting}
              disabled={form.type === "data" && !form.productCode}
            >
              Purchase
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !purchases || purchases.length === 0 ? (
            <EmptyState icon={Zap} title="No purchases yet" />
          ) : (
            <div className="space-y-2.5">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 rounded-xl border border-base-border bg-base-raised p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium capitalize text-ink">
                      {p.provider} {p.type ?? "—"}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-ink-faint">
                      {p.phoneNumber ?? p.reference}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      {formatDateTime(p.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Money value={p.amount} size="sm" />
                    <StatusPill status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
