"use client";

import { useEffect, useState } from "react";
import { Send, Settings, ShieldCheck } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { siteContentApi } from "@/lib/api/site-content";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api-client";

export default function AdminSiteContentPage() {
  const {
    data: siteContent,
    isLoading,
    refetch,
  } = useApiQuery(() => siteContentApi.get());
  const { push } = useToast();

  const [requirePlanPurchase, setRequirePlanPurchase] = useState(true);
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [flagsSaving, setFlagsSaving] = useState<string | null>(null);

  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [channelUrl, setChannelUrl] = useState("");
  const [groupUrl, setGroupUrl] = useState("");
  const [telegramSaving, setTelegramSaving] = useState(false);

  useEffect(() => {
    if (!siteContent) return;
    setRequirePlanPurchase(
      siteContent.feature_flags?.requirePlanPurchase !== false,
    );
    setAdsEnabled(siteContent.feature_flags?.adsEnabled !== false);
    setTelegramEnabled(siteContent.telegram?.enabled !== false);
    setChannelUrl(siteContent.telegram?.channelUrl ?? "");
    setGroupUrl(siteContent.telegram?.groupUrl ?? "");
  }, [siteContent]);

  async function saveFlag(
    key: "requirePlanPurchase" | "adsEnabled",
    value: boolean,
  ) {
    const revert = key === "requirePlanPurchase" ? setRequirePlanPurchase : setAdsEnabled;
    revert(value);
    setFlagsSaving(key);
    try {
      await adminApi.siteContent.update("feature_flags", {
        requirePlanPurchase: key === "requirePlanPurchase" ? value : requirePlanPurchase,
        adsEnabled: key === "adsEnabled" ? value : adsEnabled,
      });
      push("success", "Setting saved.");
      refetch();
    } catch (err) {
      revert(!value);
      push(
        "error",
        err instanceof ApiRequestError ? err.message : "Could not save setting.",
      );
    } finally {
      setFlagsSaving(null);
    }
  }

  async function saveTelegram(next: {
    enabled?: boolean;
    channelUrl?: string;
    groupUrl?: string;
  }) {
    setTelegramSaving(true);
    try {
      await adminApi.siteContent.update("telegram", {
        enabled: next.enabled ?? telegramEnabled,
        channelUrl: next.channelUrl ?? channelUrl,
        groupUrl: next.groupUrl ?? groupUrl,
      });
      push("success", "Telegram settings saved.");
      refetch();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError
          ? err.message
          : "Could not save Telegram settings.",
      );
    } finally {
      setTelegramSaving(false);
    }
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Site settings
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Feature toggles that change how the platform behaves for every user.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Registration &amp; features
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="rounded-xl border border-base-border bg-base-raised p-4">
            <Switch
              checked={requirePlanPurchase}
              onChange={(v) => saveFlag("requirePlanPurchase", v)}
              disabled={flagsSaving === "requirePlanPurchase"}
              label="Require a plan purchase to register"
              hint={
                requirePlanPurchase
                  ? "New users must pick a plan and pay via Flutterwave before their account activates."
                  : "New users are activated immediately after signup — no plan or payment required."
              }
            />
          </div>

          <div className="rounded-xl border border-base-border bg-base-raised p-4">
            <Switch
              checked={adsEnabled}
              onChange={(v) => saveFlag("adsEnabled", v)}
              disabled={flagsSaving === "adsEnabled"}
              label="Allow users to create ad campaigns"
              hint={
                adsEnabled
                  ? "Users can fund and launch ad/promote campaigns from the Ads page."
                  : "The Ads/Promote feature is locked — campaign creation is rejected server-side, not just hidden."
              }
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Telegram join prompt
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="rounded-xl border border-base-border bg-base-raised p-4">
            <Switch
              checked={telegramEnabled}
              onChange={(v) => saveTelegram({ enabled: v })}
              disabled={telegramSaving}
              label="Prompt users to join the Telegram channel"
              hint={
                telegramEnabled
                  ? "Shown once to each user after login until they click Join or Dismiss."
                  : "The Telegram join popup is disabled for everyone."
              }
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Telegram channel link"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                placeholder="https://t.me/yourchannel"
              />
            </div>
            <div className="flex-1">
              <Input
                label="Telegram group link"
                value={groupUrl}
                onChange={(e) => setGroupUrl(e.target.value)}
                placeholder="https://t.me/yourgroup"
              />
            </div>
            <Button
              type="button"
              isLoading={telegramSaving}
              onClick={() => saveTelegram({ channelUrl, groupUrl })}
            >
              <Settings className="h-4 w-4" /> Save links
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
