"use client";

import { useEffect, useState } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import type { Ad, AdType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { StatusPill } from "@/components/ui/StatusPill";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
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

  const [reviewing, setReviewing] = useState<Ad | null>(null);
  const [rewardInput, setRewardInput] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<
    "approve" | "reject" | null
  >(null);

  useEffect(() => {
    if (pricing) setPrices(pricing);
  }, [pricing]);

  function openReview(ad: Ad) {
    setReviewing(ad);
    setRewardInput(ad.pricePerUnit);
    setReviewError(null);
  }

  async function review(action: "approve" | "reject") {
    if (!reviewing) return;

    if (action === "approve") {
      if (!/^\d+(\.\d{1,2})?$/.test(rewardInput) || Number(rewardInput) <= 0) {
        setReviewError("Reward must be greater than zero.");
        return;
      }
    }

    setActionLoading(action);
    setReviewError(null);
    try {
      await adminApi.ads.review(reviewing.id, {
        action,
        ...(action === "approve" ? { reward: rewardInput } : {}),
      });
      push(
        "success",
        action === "approve" ? "Campaign approved." : "Campaign rejected.",
      );
      setReviewing(null);
      refetch();
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "Action failed.";
      setReviewError(message);
      push("error", message);
    } finally {
      setActionLoading(null);
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
                      {ad.status === "pending" ? (
                        <Button size="sm" onClick={() => openReview(ad)}>
                          Review
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openReview(ad)}
                        >
                          View details
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        title={reviewing?.title ?? "Campaign details"}
      >
        {reviewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-ink-faint">Type</p>
                <p className="mt-0.5 font-medium text-ink">
                  {AD_TYPE_LABELS[reviewing.adType]}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">Status</p>
                <p className="mt-0.5">
                  <StatusPill status={reviewing.status} />
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">Quantity</p>
                <p className="mt-0.5 font-medium text-ink">
                  {reviewing.quantity - reviewing.remainingSlots}/
                  {reviewing.quantity} completed
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">Budget</p>
                <p className="mt-0.5">
                  <Money value={reviewing.budget} size="sm" />
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">Created</p>
                <p className="mt-0.5 font-medium text-ink">
                  {formatDateTime(reviewing.createdAt)}
                </p>
              </div>
            </div>

            {reviewing.description && (
              <div>
                <p className="text-xs text-ink-faint">Description</p>
                <p className="mt-0.5 text-sm text-ink">
                  {reviewing.description}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs text-ink-faint">Target URL</p>
              <a
                href={reviewing.targetUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 block truncate text-sm text-primary hover:underline"
              >
                {reviewing.targetUrl}
              </a>
            </div>

            {reviewing.status === "pending" ? (
              <>
                <Input
                  label="Reward per completion"
                  hint="The type was set by the user and can't be changed here, but you can adjust the reward before activating."
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={rewardInput}
                  onChange={(e) => setRewardInput(e.target.value)}
                />
                {reviewError && (
                  <p className="rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                    {reviewError}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    isLoading={actionLoading === "approve"}
                    onClick={() => review("approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    className="flex-1"
                    variant="secondary"
                    isLoading={actionLoading === "reject"}
                    onClick={() => review("reject")}
                  >
                    Reject
                  </Button>
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs text-ink-faint">Reward per completion</p>
                <p className="mt-0.5">
                  <Money value={reviewing.pricePerUnit} size="sm" />
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
