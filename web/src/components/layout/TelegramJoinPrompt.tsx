"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Send, Users } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

export function TelegramJoinPrompt() {
  const [open, setOpen] = useState(false);
  const [channelUrl, setChannelUrl] = useState("");
  const [groupUrl, setGroupUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    authApi
      .telegramPromptStatus()
      .then((res) => {
        if (res.shouldShow) {
          setChannelUrl(res.channelUrl);
          setGroupUrl(res.groupUrl);
          setOpen(true);
        }
      })
      .catch(() => undefined);
  }, []);

  async function dismiss() {
    setDismissing(true);
    try {
      await authApi.markTelegramPromptSeen();
    } catch {
      // Even if this fails, close the popup for this session — it'll
      // just be offered again on next login, which is an acceptable
      // fallback rather than blocking the user here.
    } finally {
      setOpen(false);
      setDismissing(false);
    }
  }

  async function confirmJoined() {
    setSubmitting(true);
    try {
      await authApi.markTelegramJoined();
    } catch {
      // Same fallback as dismiss — don't trap the user in the modal
      // over a network hiccup; it'll just ask again next login.
    } finally {
      setOpen(false);
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={dismiss} title="Join our Telegram">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Send className="h-5 w-5" />
          </span>
          <p className="text-sm leading-6 text-ink-dim">
            Join our Telegram channel and group to get the latest updates,
            connect with other users, and never miss an announcement.
          </p>
        </div>

        <div className="space-y-2">
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-xl border border-base-border bg-base-raised px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-primary/40 hover:bg-primary-soft"
          >
            <span className="flex items-center gap-2.5">
              <Send className="h-4 w-4 text-primary" /> Join the channel
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-ink-faint" />
          </a>
          {groupUrl && (
            <a
              href={groupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-base-border bg-base-raised px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-primary/40 hover:bg-primary-soft"
            >
              <span className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-primary" /> Join the group
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-ink-faint" />
            </a>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-dashed border-base-border p-3.5">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-base-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-ink-dim">
            I've joined the {groupUrl ? "channel and group" : "channel"} above.
          </span>
        </label>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={dismiss}
            isLoading={dismissing}
            disabled={submitting}
          >
            Not now
          </Button>
          <Button
            className="flex-1"
            onClick={confirmJoined}
            isLoading={submitting}
            disabled={!confirmed || dismissing}
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
