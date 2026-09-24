"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bookmark,
  ChevronRight,
  Smartphone,
  Trash2,
  Wifi,
  Zap,
} from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { utilitiesApi } from "@/lib/api/utilities";
import type { UtilityBeneficiary, UtilityPurchase } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { Money } from "@/components/ui/Money";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Modal } from "@/components/ui/Modal";
import { DetailList } from "@/components/ui/DetailList";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import {
  cn,
  formatDateTime,
  formatMoney,
  isValidNigerianPhone,
  normalizeNigerianPhone,
} from "@/lib/utils";

type Provider = "mtn" | "airtel" | "glo" | "9mobile";
type PurchaseType = "airtime" | "data";

const TYPES: { value: PurchaseType; label: string; icon: typeof Smartphone }[] =
  [
    { value: "airtime", label: "Airtime", icon: Smartphone },
    { value: "data", label: "Data", icon: Wifi },
  ];

const NETWORKS: { value: Provider; label: string }[] = [
  { value: "mtn", label: "MTN" },
  { value: "airtel", label: "Airtel" },
  { value: "glo", label: "Glo" },
  { value: "9mobile", label: "9mobile" },
];

const BUNDLE_PERIODS = [
  { value: "all", label: "All", pattern: null },
  {
    value: "daily",
    label: "Daily",
    pattern: /\b(1|one)\s*days?\b|daily|24\s*h/i,
  },
  { value: "weekly", label: "Weekly", pattern: /\b(7|seven)\s*days?\b|week/i },
  { value: "monthly", label: "Monthly", pattern: /\b30\s*days?\b|month/i },
] as const;

type BundlePeriod = (typeof BUNDLE_PERIODS)[number]["value"];

function maskPhone(phoneNumber: string) {
  if (phoneNumber.length <= 4) return phoneNumber;
  return `${phoneNumber.slice(0, 4)}····${phoneNumber.slice(-2)}`;
}

export default function UtilitiesPage() {
  const searchParams = useSearchParams();
  const initialType: PurchaseType =
    searchParams.get("type") === "data" ? "data" : "airtime";

  const {
    data: purchases,
    isLoading,
    refetch,
  } = useApiQuery(() => utilitiesApi.myPurchases());
  const { data: beneficiaries, refetch: refetchBeneficiaries } = useApiQuery(
    () => utilitiesApi.listBeneficiaries(),
  );

  const [form, setForm] = useState({
    type: initialType,
    provider: "mtn" as Provider,
    phoneNumber: "",
    amount: "",
    productCode: "",
  });
  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPurchase, setSelectedPurchase] =
    useState<UtilityPurchase | null>(null);
  const { push } = useToast();

  const { data: bundles, isLoading: bundlesLoading } = useApiQuery(
    () =>
      form.type === "data"
        ? utilitiesApi.dataBundles(form.provider)
        : Promise.resolve([]),
    [form.type, form.provider],
  );

  const [bundleQuery, setBundleQuery] = useState("");
  const [bundlePeriod, setBundlePeriod] = useState<BundlePeriod>("all");

  useEffect(() => {
    setForm((f) => ({ ...f, productCode: "", amount: "" }));
    setBundleQuery("");
    setBundlePeriod("all");
  }, [form.type, form.provider]);

  // Only offer period chips that actually match some bundle names —
  // Flutterwave's naming varies by network.
  const availablePeriods = BUNDLE_PERIODS.filter(
    (p) => !p.pattern || bundles?.some((b) => p.pattern.test(b.name)),
  );
  const activePeriod = BUNDLE_PERIODS.find((p) => p.value === bundlePeriod);
  const visibleBundles = (bundles ?? [])
    .filter((b) => !activePeriod?.pattern || activePeriod.pattern.test(b.name))
    .filter((b) =>
      b.name.toLowerCase().includes(bundleQuery.trim().toLowerCase()),
    )
    .sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0));
  const selectedBundle = bundles?.find((b) => b.item_code === form.productCode);

  const normalizedPhone = normalizeNigerianPhone(form.phoneNumber);
  const phoneLooksValid = isValidNigerianPhone(form.phoneNumber);

  const beneficiariesForNetwork =
    beneficiaries?.filter((b) => b.provider === form.provider) ?? [];

  const numberAlreadySaved = beneficiariesForNetwork.some(
    (b) => normalizeNigerianPhone(b.phoneNumber) === normalizedPhone,
  );

  function selectBundle(itemCode: string) {
    const bundle = bundles?.find((b) => b.item_code === itemCode);
    setForm((f) => ({
      ...f,
      productCode: itemCode,
      amount: bundle?.amount ? String(bundle.amount) : f.amount,
    }));
  }

  function selectBeneficiary(beneficiary: UtilityBeneficiary) {
    setForm((f) => ({ ...f, phoneNumber: beneficiary.phoneNumber }));
    setSaveAsBeneficiary(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phoneLooksValid) {
      setError("Enter a valid phone number, e.g. 08012345678 or 8012345678.");
      return;
    }
    setSubmitting(true);
    try {
      await utilitiesApi.purchase({
        type: form.type,
        provider: form.provider,
        phoneNumber: normalizedPhone,
        amount: form.amount,
        productCode: form.type === "data" ? form.productCode : undefined,
      });

      if (saveAsBeneficiary && !numberAlreadySaved) {
        try {
          await utilitiesApi.addBeneficiary({
            provider: form.provider,
            phoneNumber: normalizedPhone,
          });
          refetchBeneficiaries();
        } catch {
          // The purchase already succeeded — a failed save shouldn't
          // block that, so this is silent (e.g. a duplicate race).
        }
      }

      window.dispatchEvent(new Event("wallet-updated"));
      push("success", "Purchase submitted.");
      setForm((f) => ({ ...f, amount: "", phoneNumber: "", productCode: "" }));
      setSaveAsBeneficiary(false);
      refetch();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not complete purchase.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Utilities
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Buy airtime and data from your account wallet.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New purchase</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-dim">
                Type
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-colors",
                      form.type === t.value
                        ? "border-primary bg-primary-soft"
                        : "border-base-border bg-base-raised hover:bg-base-surface2",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        form.type === t.value
                          ? "bg-primary/20 text-primary"
                          : "bg-base-surface2 text-ink-faint",
                      )}
                    >
                      <t.icon className="h-4.5 w-4.5" />
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        form.type === t.value ? "text-primary" : "text-ink",
                      )}
                    >
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink-dim">
                Network
              </span>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {NETWORKS.map((n) => (
                  <button
                    key={n.value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, provider: n.value }))
                    }
                    className={cn(
                      "rounded-xl border p-3 text-center text-sm font-semibold transition-colors",
                      form.provider === n.value
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-base-border bg-base-raised text-ink hover:bg-base-surface2",
                    )}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Input
                label="Phone number"
                type="tel"
                required
                maxLength={20}
                placeholder="08012345678"
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phoneNumber: e.target.value }))
                }
              />

              {beneficiariesForNetwork.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {beneficiariesForNetwork.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => selectBeneficiary(b)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 font-mono text-xs font-medium transition-colors",
                        normalizedPhone ===
                          normalizeNigerianPhone(b.phoneNumber)
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-base-border text-ink-dim hover:border-primary-dim/50 hover:text-ink",
                      )}
                    >
                      {b.label || maskPhone(b.phoneNumber)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setManageOpen(true)}
                    className="rounded-full border border-dashed border-base-border px-3 py-1.5 text-xs font-medium text-ink-faint hover:border-primary-dim/50 hover:text-ink"
                  >
                    Manage
                  </button>
                </div>
              )}

              {phoneLooksValid && !numberAlreadySaved && (
                <label className="mt-3 flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={saveAsBeneficiary}
                    onChange={(e) => setSaveAsBeneficiary(e.target.checked)}
                    className="h-4 w-4 rounded border-base-border text-primary focus:ring-primary/40"
                  />
                  <span className="text-xs text-ink-dim">
                    Save this number as a beneficiary
                  </span>
                </label>
              )}
            </div>

            {form.type === "data" ? (
              <div>
                <span className="mb-1.5 block text-xs font-medium text-ink-dim">
                  Bundle
                </span>
                {bundlesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14" />
                    <Skeleton className="h-14" />
                  </div>
                ) : !bundles || bundles.length === 0 ? (
                  <p className="text-sm text-ink-faint">
                    No bundles available for this network right now.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    <Input
                      placeholder="Search bundles, e.g. 1GB"
                      value={bundleQuery}
                      onChange={(e) => setBundleQuery(e.target.value)}
                    />
                    {availablePeriods.length > 1 && (
                      <div className="flex flex-wrap gap-2">
                        {availablePeriods.map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setBundlePeriod(p.value)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                              bundlePeriod === p.value
                                ? "border-primary bg-primary-soft text-primary"
                                : "border-base-border text-ink-dim hover:text-ink",
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {visibleBundles.length === 0 ? (
                      <p className="text-sm text-ink-faint">
                        No bundles match your search.
                      </p>
                    ) : (
                      <div className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto overscroll-contain rounded-xl pr-1 sm:grid-cols-2">
                        {visibleBundles.map((b) => (
                          <button
                            key={b.item_code}
                            type="button"
                            onClick={() => selectBundle(b.item_code)}
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors",
                              form.productCode === b.item_code
                                ? "border-primary bg-primary-soft"
                                : "border-base-border bg-base-raised hover:bg-base-surface2",
                            )}
                          >
                            <span className="min-w-0 truncate text-sm font-medium text-ink">
                              {b.name}
                            </span>
                            {b.amount != null && (
                              <span
                                className={cn(
                                  "shrink-0 text-sm font-semibold",
                                  form.productCode === b.item_code
                                    ? "text-primary"
                                    : "text-ink-dim",
                                )}
                              >
                                {formatMoney(b.amount)}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Input
                label="Amount (NGN)"
                type="number"
                min={1}
                step="0.01"
                required
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            )}

            {form.type === "data" && selectedBundle && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-primary bg-primary-soft px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-ink-faint">Selected bundle</p>
                  <p className="truncate text-sm font-semibold text-ink">
                    {selectedBundle.name}
                  </p>
                </div>
                {selectedBundle.amount != null && (
                  <span className="shrink-0 text-sm font-semibold text-primary">
                    {formatMoney(selectedBundle.amount)}
                  </span>
                )}
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              isLoading={submitting}
              disabled={form.type === "data" && !form.productCode}
            >
              Purchase
            </Button>

            <p className="rounded-xl bg-base-surface2 px-4 py-3 text-xs leading-relaxed text-ink-dim">
              <span className="font-semibold text-ink">Tip:</span> Airtime and
              data usually arrive within a few minutes, but the network can
              sometimes take longer. You can enter the number with or without
              the 0 at the start. Make sure it matches the network you picked.
            </p>
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
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPurchase(p)}
                  className="flex w-full items-center gap-4 rounded-xl border border-base-border bg-base-raised p-4 text-left transition-colors hover:border-base-borderStrong"
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
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Manage beneficiaries"
      >
        <ManageBeneficiaries
          beneficiaries={beneficiaries ?? []}
          onChanged={refetchBeneficiaries}
        />
      </Modal>

      <BottomSheet
        open={!!selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
        title="Purchase details"
      >
        {selectedPurchase && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-base-surface2 px-4 py-3.5">
              <div>
                <p className="text-xs text-ink-faint">Amount</p>
                <Money
                  value={selectedPurchase.amount}
                  size="lg"
                  className="mt-0.5"
                />
              </div>
              <StatusPill status={selectedPurchase.status} />
            </div>

            <DetailList
              rows={[
                { label: "Type", value: selectedPurchase.type },
                { label: "Network", value: selectedPurchase.provider },
                { label: "Phone number", value: selectedPurchase.phoneNumber },
                { label: "Reference", value: selectedPurchase.reference },
                { label: "Response", value: selectedPurchase.responseMessage },
                {
                  label: "Date",
                  value: formatDateTime(selectedPurchase.createdAt),
                },
              ]}
            />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function ManageBeneficiaries({
  beneficiaries,
  onChanged,
}: {
  beneficiaries: UtilityBeneficiary[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(beneficiaries.length === 0);
  const [provider, setProvider] = useState<Provider>("mtn");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { push } = useToast();

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidNigerianPhone(phoneNumber)) {
      setError("Enter a valid phone number, e.g. 08012345678 or 8012345678.");
      return;
    }
    setSubmitting(true);
    try {
      await utilitiesApi.addBeneficiary({
        provider,
        phoneNumber: normalizeNigerianPhone(phoneNumber),
        label: label || undefined,
      });
      push("success", "Beneficiary added.");
      setPhoneNumber("");
      setLabel("");
      setAdding(false);
      onChanged();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not add beneficiary.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      await utilitiesApi.deleteBeneficiary(id);
      push("success", "Beneficiary removed.");
      onChanged();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError
          ? err.message
          : "Could not remove beneficiary.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {beneficiaries.length > 0 && (
        <div className="space-y-2">
          {beneficiaries.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-xl border border-base-border bg-base-raised p-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Bookmark className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                  {b.label || maskPhone(b.phoneNumber)}
                  <span className="rounded-full bg-base-surface2 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-faint">
                    {b.provider === "9mobile" ? "9mobile" : b.provider}
                  </span>
                </p>
                <p className="truncate font-mono text-[11px] text-ink-faint">
                  {b.phoneNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(b.id)}
                disabled={deletingId === b.id}
                aria-label="Remove beneficiary"
                className="shrink-0 rounded-lg p-2 text-ink-faint hover:bg-danger-soft hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <form
          onSubmit={onAdd}
          className="space-y-4 border-t border-base-border pt-4"
        >
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">
              Network
            </span>
            <div className="grid grid-cols-4 gap-2">
              {NETWORKS.map((n) => (
                <button
                  key={n.value}
                  type="button"
                  onClick={() => setProvider(n.value)}
                  className={cn(
                    "rounded-xl border p-2.5 text-center text-xs font-semibold transition-colors",
                    provider === n.value
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-base-border bg-base-raised text-ink hover:bg-base-surface2",
                  )}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Phone number"
            type="tel"
            required
            maxLength={20}
            placeholder="08012345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <Input
            label="Label (optional)"
            placeholder="e.g. My phone"
            maxLength={60}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            {beneficiaries.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              isLoading={submitting}
              disabled={phoneNumber.trim().length < 10}
            >
              Save beneficiary
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setAdding(true)}
        >
          <ChevronRight className="h-4 w-4" /> Add another beneficiary
        </Button>
      )}
    </div>
  );
}
