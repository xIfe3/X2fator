"use client";

import { useEffect, useState } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import type { AdType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { StatusPill } from "@/components/ui/StatusPill";
import { Input } from "@/components/ui/Input";
import { Money } from "@/components/ui/Money";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

const AD_TYPE_LABELS: Record<AdType, string> = {
  app_download: "App downloads",
  followers: "Followers",
  subscribers: "Subscribers",
  comments: "Comments",
  likes: "Likes",
};

export default function AdminAdsPage() {
  const { data: ads, isLoading, refetch } = useApiQuery(() =>
    adminApi.ads.all(),
  );
  const { data: pricing, refetch: refetchPricing } = useApiQuery(() =>
    adminApi.ads.pricing(),
  );
  const [prices, setPrices] = useState<Partial<Record<AdType, string>>>({});
  const [savingPricing, setSavingPricing] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    if (pricing) setPrices(pricing);
  }, [pricing]);

  async function review(id: string, action: "approve" | "reject") {
    try {
      await adminApi.ads.review(id, { action });
      push(
        "success",
        action === "approve" ? "Campaign approved." : "Campaign rejected.",
      );
      refetch();
    } catch (error) {
      push(
        "error",
        error instanceof ApiRequestError ? error.message : "Action failed.",
      );
    }
  }

  async function savePricing() {
    setSavingPricing(true);
    try {
      await adminApi.ads.updatePricing(prices);
      push("success", "Ad pricing updated.");
      refetchPricing();
    } catch (error) {
      push(
        "error",
        error instanceof ApiRequestError
          ? error.message
          : "Could not update pricing.",
      );
    } finally {
      setSavingPricing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Ad campaigns
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Review user-funded campaigns and set the price per action.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pricing per action</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(AD_TYPE_LABELS) as AdType[]).map((type) => (
            <Input
              key={type}
              label={AD_TYPE_LABELS[type]}
              type="number"
              min="0.01"
              step="0.01"
              value={prices[type] ?? ""}
              onChange={(e) =>
                setPrices({ ...prices, [type]: e.target.value })
              }
            />
          ))}
          <div className="sm:col-span-3">
            <Button isLoading={savingPricing} onClick={savePricing}>
              Save pricing
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campaign review</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <p className="text-sm text-ink-dim">Loading campaigns...</p>
          ) : !ads || ads.length === 0 ? (
            <p className="text-sm text-ink-dim">No campaigns yet.</p>
          ) : (
            <Table>
              <THead>
                <Th>Title</Th>
                <Th>Type</Th>
                <Th>Progress</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th className="text-right">Budget</Th>
                <Th />
              </THead>
              <tbody>
                {ads.map((ad) => (
                  <Tr key={ad.id}>
                    <Td className="text-ink">{ad.title}</Td>
                    <Td className="text-ink-dim">
                      {AD_TYPE_LABELS[ad.adType]}
                    </Td>
                    <Td className="text-ink-dim">
                      {ad.quantity - ad.remainingSlots}/{ad.quantity}
                    </Td>
                    <Td className="text-ink-dim">
                      {formatDateTime(ad.createdAt)}
                    </Td>
                    <Td>
                      <StatusPill status={ad.status} />
                    </Td>
                    <Td className="text-right">
                      <Money value={ad.budget} size="sm" />
                    </Td>
                    <Td className="text-right">
                      {ad.status === "pending" && (
                        <span className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => review(ad.id, "approve")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => review(ad.id, "reject")}
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
    </div>
  );
}
