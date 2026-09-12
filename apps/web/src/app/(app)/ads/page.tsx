"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { adsApi } from "@/lib/api/ads";
import { useApiQuery } from "@/hooks/useApiQuery";
import type { AdType } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { Money } from "@/components/ui/Money";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api-client";
import { formatMoney, formatDate } from "@/lib/utils";

const AD_TYPE_LABELS: Record<AdType, string> = {
  app_download: "App downloads",
  followers: "Followers",
  subscribers: "Subscribers",
  comments: "Comments",
  likes: "Likes",
};

export default function AdsPage() {
  const { data: ads, refetch } = useApiQuery(() => adsApi.mine());
  const { data: pricing } = useApiQuery(() => adsApi.pricing());
  const { push } = useToast();
  const [form, setForm] = useState({
    adType: "likes" as AdType,
    title: "",
    description: "",
    targetUrl: "",
    quantity: "50",
  });
  const [saving, setSaving] = useState(false);

  const quantity = Number(form.quantity) || 0;
  const pricePerUnit = pricing ? Number(pricing[form.adType]) : 0;
  const totalCost = quantity * pricePerUnit;

  async function submit() {
    setSaving(true);
    try {
      await adsApi.create({ ...form, quantity });
      push("success", "Ad campaign submitted for review.");
      setForm({
        adType: "likes",
        title: "",
        description: "",
        targetUrl: "",
        quantity: "50",
      });
      refetch();
    } catch (error) {
      push(
        "error",
        error instanceof ApiRequestError
          ? error.message
          : "Could not submit the campaign. Check your balance and details.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Promote something
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Create a campaign and other users complete it for you — pay from
          your account wallet, priced per action.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> New campaign
          </CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Campaign type"
            value={form.adType}
            onChange={(e) =>
              setForm({ ...form, adType: e.target.value as AdType })
            }
          >
            {(Object.keys(AD_TYPE_LABELS) as AdType[]).map((type) => (
              <option key={type} value={type}>
                {AD_TYPE_LABELS[type]}
                {pricing ? ` — ${formatMoney(pricing[type])} each` : ""}
              </option>
            ))}
          </Select>
          <Input
            label="Campaign title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Grow my creator page"
          />
          <Input
            className="sm:col-span-2"
            label="Target URL"
            type="url"
            value={form.targetUrl}
            onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
            placeholder="https://..."
          />
          <Input
            label="Quantity"
            type="number"
            min="1"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            hint={`${formatMoney(pricePerUnit)} per ${AD_TYPE_LABELS[form.adType].toLowerCase().replace(/s$/, "")}`}
          />
          <div className="flex flex-col justify-end">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              Total cost
            </p>
            <Money value={totalCost} size="lg" tone="primary" className="mt-1 block" />
          </div>
          <Textarea
            className="sm:col-span-2"
            label="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Button isLoading={saving} onClick={submit} disabled={!quantity}>
              Submit campaign
            </Button>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Your campaigns</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {ads?.length ? (
            ads.map((ad) => (
              <div
                key={ad.id}
                className="flex flex-col gap-2 border-b border-base-border pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink">{ad.title}</p>
                  <p className="text-xs text-ink-faint">
                    {AD_TYPE_LABELS[ad.adType]} · {formatDate(ad.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-ink-dim">
                    {ad.quantity - ad.remainingSlots}/{ad.quantity} completed
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <Money value={ad.budget} size="sm" tone="primary" />
                  <div className="mt-1">
                    <StatusPill status={ad.status} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-dim">
              Your submitted campaigns will appear here.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
