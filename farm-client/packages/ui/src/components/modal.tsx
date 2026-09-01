import * as React from 'react';
import { cn } from '../lib/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }: ModalProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={cn('bg-white dark:bg-gray-800 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto w-full mx-4', maxWidth)} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Close">×</button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">{footer}</div>}
      </div>
    </div>
  );
}

export { Modal };
