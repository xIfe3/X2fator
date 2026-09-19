"use client";

import { FormEvent, useState } from "react";
import { Bell, Send, Users as UsersIcon } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { adminApi } from "@/lib/api/admin";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ApiRequestError } from "@/lib/api-client";

const NOTIFICATION_TYPES = [
  "general",
  "deposit",
  "withdrawal",
  "plan",
  "task",
  "referral",
  "security",
  "system",
];

export default function AdminNotificationsPage() {
  const [mode, setMode] = useState<"user" | "broadcast">("user");
  const { data: users } = useApiQuery(() => adminApi.users.list());

  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("general");
  const [sending, setSending] = useState(false);
  const { push } = useToast();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      push("error", "Title and message are required.");
      return;
    }
    if (mode === "user" && !userId) {
      push("error", "Choose a user to notify.");
      return;
    }

    setSending(true);
    try {
      if (mode === "broadcast") {
        const res = await adminApi.notifications.broadcast({
          title: title.trim(),
          message: message.trim(),
          type,
        });
        push("success", `Notification sent to ${res.sent} users.`);
      } else {
        await adminApi.notifications.sendToUser(userId, {
          title: title.trim(),
          message: message.trim(),
          type,
        });
        push("success", "Notification sent.");
      }
      setTitle("");
      setMessage("");
    } catch (err) {
      push(
        "error",
        err instanceof ApiRequestError
          ? err.message
          : "Could not send notification.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          Send an in-app notification to one user, or broadcast to everyone.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Compose
          </CardTitle>
          <Tabs
            tabs={[
              { key: "user", label: "One user" },
              { key: "broadcast", label: "Broadcast to all" },
            ]}
            active={mode}
            onChange={(k) => setMode(k as "user" | "broadcast")}
          />
        </CardHeader>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "user" ? (
              <SearchSelect
                label="Recipient"
                required
                placeholder="Select a user"
                searchPlaceholder="Search by name or email…"
                value={userId}
                onChange={setUserId}
                options={
                  users?.map((u) => ({
                    value: u.id,
                    label: `${u.firstName} ${u.lastName} — ${u.email}`,
                  })) ?? []
                }
              />
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-base-border p-3.5 text-sm text-ink-dim">
                <UsersIcon className="h-4 w-4 shrink-0" />
                This will notify all {users?.length ?? "…"} registered users.
              </div>
            )}
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {NOTIFICATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Input
              label="Title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled maintenance"
            />
            <Textarea
              label="Message"
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the notification body…"
            />
            <Button type="submit" isLoading={sending}>
              <Send className="h-4 w-4" />{" "}
              {mode === "broadcast" ? "Broadcast" : "Send notification"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
