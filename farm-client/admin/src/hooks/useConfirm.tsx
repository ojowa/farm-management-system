'use client';

import { useCallback, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/**
 * Hook that replaces native `confirm()` with the styled ConfirmDialog.
 *
 * Returns a `confirm` function that returns a Promise<boolean>, mirroring the
 * native confirm() API but rendering an accessible, mobile-friendly dialog
 * instead of an unstyled browser alert. Also returns a `ConfirmDialog` element
 * that the caller must render in their component tree.
 *
 * Usage:
 *   const { confirm, ConfirmDialogEl } = useConfirm();
 *   // In component body: {ConfirmDialogEl}
 *   // In handler: if (await confirm('Delete this record?')) { ... }
 */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((msg: string, t?: string): Promise<boolean> => {
    setMessage(msg);
    setTitle(t ?? 'Confirm');
    setOpen(true);
    return new Promise((resolve) => {
      setResolvePromise(resolve);
    });
  }, []);

  const onConfirm = useCallback(() => {
    setOpen(false);
    resolvePromise?.(true);
    setResolvePromise(null);
  }, [resolvePromise]);

  const onCancel = useCallback(() => {
    setOpen(false);
    resolvePromise?.(false);
    setResolvePromise(null);
  }, [resolvePromise]);

  return {
    confirm,
    confirmDialog: (
      <ConfirmDialog
        open={open}
        title={title}
        message={message}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    ),
  };
}
