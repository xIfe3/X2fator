"use client";

import { Bell, Check } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { notificationsApi } from "@/lib/api/notifications";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api-client";
import { cn, formatDateTime } from "@/lib/utils";

export default function NotificationsPage() {
  const { data: notifications, isLoading, refetch, setData } = useApiQuery(() => notificationsApi.list());
  const { push } = useToast();

  async function markRead(id: string) {
    try {
      await notificationsApi.markRead(id);
      setData((prev) => (prev ? prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)) : prev));
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not update notification.");
    }
  }

  async function markAllRead() {
    try {
      await notificationsApi.markAllRead();
      refetch();
      push("success", "All notifications marked as read.");
    } catch (err) {
      push("error", err instanceof ApiRequestError ? err.message : "Could not update notifications.");
    }
  }

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-ink-dim">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            <Check className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All notifications</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <PageSkeleton />
          ) : !notifications || notifications.length === 0 ? (
            <EmptyState icon={Bell} title="Nothing here yet" description="Account and earnings updates will show up here." />
          ) : (
            <div className="divide-y divide-base-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={cn(
                    "flex w-full items-start gap-3 py-4 text-left transition-colors",
                    !n.isRead && "hover:bg-base-surface2/60",
                  )}
                >
                  <span
                    className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-mint")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", n.isRead ? "text-ink-dim" : "font-medium text-ink")}>{n.title}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">{n.message}</p>
                    <p className="mt-1 text-[11px] text-ink-faint">{formatDateTime(n.createdAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
