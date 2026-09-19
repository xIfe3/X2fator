"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "primary",
  isLoading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "primary" | "danger";
  isLoading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm leading-6 text-ink-dim">{description}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant={variant} isLoading={isLoading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
