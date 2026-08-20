"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { siteContentApi } from "@/lib/api/site-content";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";

const SECTIONS: { key: string; label: string; hint: string }[] = [
  {
    key: "hero",
    label: "Hero",
    hint: "Headline, subheadline, and CTA labels shown at the top of the homepage.",
  },
  {
    key: "features",
    label: "Features",
    hint: `An "items" array of { title, description } shown in the features section.`,
  },
  {
    key: "about",
    label: "About",
    hint: "Heading and body text for the About section.",
  },
  {
    key: "contact",
    label: "Contact",
    hint: "Heading, email, phone, and address shown in the Contact section.",
  },
  {
    key: "legal",
    label: "Legal",
    hint: "Terms and privacy policy titles/bodies.",
  },
  {
    key: "daily_bonus",
    label: "Daily bonus",
    hint: 'Set the daily login bonus amount and whether claiming is enabled. Example: { enabled: true, amount: "50.00" }.',
  },
];

export default function AdminSiteContentPage() {
  const { data, isLoading, refetch } = useApiQuery(() => siteContentApi.get());
  const { push } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    setDrafts(
      Object.fromEntries(
        SECTIONS.map((s) => [
          s.key,
          JSON.stringify(data[s.key as keyof typeof data] ?? {}, null, 2),
        ]),
      ),
    );
  }, [data]);

  async function save(sectionKey: string) {
    setErrors((e) => ({ ...e, [sectionKey]: "" }));
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(drafts[sectionKey] ?? "{}");
    } catch {
      setErrors((e) => ({
        ...e,
        [sectionKey]:
          "That's not valid JSON — check for a missing comma or quote.",
      }));
      return;
    }
    setSaving(sectionKey);
    try {
      await adminApi.siteContent.update(sectionKey, parsed);
      push("success", "Saved. Live on the homepage now.");
      refetch();
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [sectionKey]:
          err instanceof ApiRequestError
            ? err.message
            : "Could not save this section.",
      }));
    } finally {
      setSaving(null);
    }
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Landing page content
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Edit the copy shown on the public homepage. Changes go live
          immediately.
        </p>
      </div>

      {SECTIONS.map((s) => (
        <Card key={s.key}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-mint" /> {s.label}
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-xs text-ink-faint">{s.hint}</p>
            <Textarea
              rows={8}
              className="font-mono text-xs"
              value={drafts[s.key] ?? ""}
              onChange={(e) =>
                setDrafts((d) => ({ ...d, [s.key]: e.target.value }))
              }
            />
            {errors[s.key] && (
              <p className="text-sm text-danger">{errors[s.key]}</p>
            )}
            <Button
              size="sm"
              isLoading={saving === s.key}
              onClick={() => save(s.key)}
            >
              Save {s.label.toLowerCase()}
            </Button>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
