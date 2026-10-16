'use client';

import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button destructively (delete/archive actions). */
  destructive?: boolean;
  /** Disables both buttons and shows the spinner on confirm while in flight. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shared yes/no confirmation built on the a11y-hardened Dialog — replaces the
 * native confirm() calls, which were unstyled, untestable, and blocked the
 * thread while visible.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // The backdrop/Escape/X all funnel through here — don't dismiss while
        // the action is in flight.
        if (!next && !loading) onCancel();
      }}
      title={title}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
