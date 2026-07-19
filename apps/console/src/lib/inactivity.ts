// Auto-logout after a period of user inactivity.
// Resets on user interaction (mouse, keyboard, touch, scroll, click).
// After IDLE_TIMEOUT_MS of no activity, calls onTimeout (which should log the user out).

import { authAudit } from '@/lib/auth-audit';

export const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
  'wheel',
];

export function startInactivityTracker(onTimeout: () => void, timeoutMs: number = IDLE_TIMEOUT_MS): () => void {
  let timer: ReturnType<typeof setTimeout>;

  const reset = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(wrappedOnTimeout, timeoutMs);
  };

  // Wrap onTimeout so we audit the idle auto-logout event.
  const wrappedOnTimeout = () => {
    authAudit('IDLE_TIMEOUT', { timeoutMs });
    onTimeout();
  };

  ACTIVITY_EVENTS.forEach((event) => {
    window.addEventListener(event, reset, { passive: true });
  });

  reset();

  return () => {
    if (timer) clearTimeout(timer);
    ACTIVITY_EVENTS.forEach((event) => {
      window.removeEventListener(event, reset);
    });
    authAudit('IDLE_TIMEOUT', { action: 'tracker_stopped' });
  };
}
