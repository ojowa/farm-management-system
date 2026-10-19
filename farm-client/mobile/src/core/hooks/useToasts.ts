import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import {
  showToast as showToastAction,
  removeToast as removeToastAction,
  clearToasts as clearToastsAction,
  ToastType,
} from '../../store/slices/uiSlice';

let counter = 0;
const nextId = () => `toast-${Date.now()}-${counter++}`;

export interface UseToasts {
  toasts: ReturnType<typeof useSelector<RootState, RootState['ui']['toasts']>>;
  showToast: (message: string, type?: ToastType, durationMs?: number) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  success: (message: string, durationMs?: number) => string;
  error: (message: string, durationMs?: number) => string;
  info: (message: string, durationMs?: number) => string;
  warning: (message: string, durationMs?: number) => string;
}

export const useToasts = (): UseToasts => {
  const dispatch = useDispatch<AppDispatch>();
  const toasts = useSelector((state: RootState) => state.ui.toasts);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', durationMs = 4000) => {
      const id = nextId();
      dispatch(showToastAction({ id, message, type, duration: durationMs }));
      return id;
    },
    [dispatch]
  );

  const removeToast = useCallback(
    (id: string) => dispatch(removeToastAction(id)),
    [dispatch]
  );

  const clearToasts = useCallback(() => dispatch(clearToastsAction()), [dispatch]);

  const success = useCallback(
    (msg: string, dur?: number) => showToast(msg, 'success', dur),
    [showToast]
  );
  const error = useCallback(
    (msg: string, dur?: number) => showToast(msg, 'error', dur ?? 6000),
    [showToast]
  );
  const info = useCallback((msg: string, dur?: number) => showToast(msg, 'info', dur), [showToast]);
  const warning = useCallback(
    (msg: string, dur?: number) => showToast(msg, 'warning', dur ?? 5000),
    [showToast]
  );

  return useMemo(
    () => ({
      toasts,
      showToast,
      removeToast,
      clearToasts,
      success,
      error,
      info,
      warning,
    }),
    [toasts, showToast, removeToast, clearToasts, success, error, info, warning]
  );
};
