import { AppState, AppStateStatus } from 'react-native';

// Auto-logout after a period of user inactivity (React Native).
// Resets on user interaction (touch, keypress, etc). After IDLE_TIMEOUT_MS
// of no activity, calls onTimeout (which should log the user out).

export const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function startInactivityTracker(onTimeout: () => void, timeoutMs: number = IDLE_TIMEOUT_MS): () => void {
  let timer: ReturnType<typeof setTimeout>;

  // Call once to (re)arm; exposed so callers can reset on app-level activity.
  const reset = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onTimeout, timeoutMs);
  };

  // AppState transitions to 'active' count as activity.
  let lastState: AppStateStatus | null = null;
  const onAppStateChange = (nextState: AppStateStatus) => {
    if (nextState === 'active' && lastState !== 'active') {
      reset();
    }
    lastState = nextState;
  };

  const subscription = AppState.addEventListener('change', onAppStateChange);

  reset();

  return () => {
    if (timer) clearTimeout(timer);
    subscription?.remove();
  };
}
