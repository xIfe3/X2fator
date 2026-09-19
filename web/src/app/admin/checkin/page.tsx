"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarCheck, Flame, Save, Trophy, Users as UsersIcon } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

export default function AdminCheckInPage() {
  const {
    data: settings,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useApiQuery(() => adminApi.bonuses.settings());
  const { data: stats, isLoading: statsLoading } = useApiQuery(() =>
    adminApi.bonuses.stats(),
  );

  const [enabled, setEnabled] = useState(true);
  const [amount, setAmount] = useState("");
  const [milestoneAmount, setMilestoneAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setAmount(settings.amount);
      setMilestoneAmount(settings.milestoneAmount);
    }
  }, [settings]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.bonuses.updateSettings({ enabled, amount, milestoneAmount });
      push("success", "Check-in settings updated.");
      refetchSettings();
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError ? err.message : "Could not save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Daily check-in
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Configure the daily login bonus and see who's on a streak.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Claimed today"
          value={stats ? stats.claimedToday.toLocaleString() : "—"}
          icon={UsersIcon}
        />
        <StatCard
          label="Total paid out"
          value={stats ? `₦${Number(stats.totalPaid).toLocaleString()}` : "—"}
          icon={CalendarCheck}
          tone="secondary"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bonus settings</CardTitle>
        </CardHeader>
        <CardBody>
          {settingsLoading ? (
            <PageSkeleton />
          ) : (
            <form onSubmit={onSave} className="space-y-4">
              <Switch
                label="Daily bonus enabled"
                hint="Turn off to pause check-in rewards platform-wide."
                checked={enabled}
                onChange={setEnabled}
              />
              <Input
                label="Daily bonus amount (₦)"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50.00"
              />
              <Input
                label="30-day milestone bonus (₦)"
                required
                value={milestoneAmount}
                onChange={(e) => setMilestoneAmount(e.target.value)}
                placeholder="5000.00"
              />
              <Button type="submit" isLoading={saving}>
                <Save className="h-4 w-4" /> Save settings
              </Button>
            </form>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Streak leaderboard
          </CardTitle>
        </CardHeader>
        <CardBody>
          {statsLoading ? (
            <PageSkeleton />
          ) : !stats || stats.topStreaks.length === 0 ? (
            <EmptyState
              icon={Flame}
              title="No active streaks"
              description="No users currently hold a check-in streak."
            />
          ) : (
            <Table>
              <THead>
                <Th>User</Th>
                <Th>Current streak</Th>
                <Th>Longest streak</Th>
                <Th>Last claim</Th>
              </THead>
              <tbody>
                {stats.topStreaks.map((u) => (
                  <Tr key={u.id}>
                    <Td>
                      <p className="font-medium text-ink">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-ink-faint">{u.email}</p>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 font-medium text-secondary">
                        <Flame className="h-3.5 w-3.5" /> {u.currentStreak} days
                      </span>
                    </Td>
                    <Td className="text-ink-dim">{u.longestStreak} days</Td>
                    <Td className="text-ink-dim">
                      {u.lastBonusClaimDate
                        ? formatDateTime(u.lastBonusClaimDate)
                        : "—"}
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
