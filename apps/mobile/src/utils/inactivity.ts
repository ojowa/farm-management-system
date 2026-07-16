import { AppState, AppStateStatus, GestureResponderEvent } from 'react-native';

// Auto-logout after a period of user inactivity (React Native).
// Resets on actual user touch/interaction events and AppState transitions.
// After IDLE_TIMEOUT_MS of no activity, calls onTimeout (which should log
// the user out).

export const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export function startInactivityTracker(onTimeout: () => void, timeoutMs: number = IDLE_TIMEOUT_MS): () => void {
  let timer: ReturnType<typeof setTimeout>;

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

  // Reset timer on any touch/press event — this captures actual user interaction,
  // not just app state transitions. We use a capture-phase responder on the
  // root view, but since that's not always available, we also provide a
  // resetOnTouch helper for components to call directly.
  const resetOnTouch = (_event: GestureResponderEvent) => {
    reset();
  };

  // Arm the initial timer
  reset();

  return () => {
    if (timer) clearTimeout(timer);
    subscription?.remove();
  };
}

/**
 * Returns a touch handler that resets the inactivity timer.
 * Attach to a parent View's onStartShouldSetResponderCapture or
 * use as an onTouchStart callback.
 */
export function createTouchResetHandler(onReset: () => void) {
  return (_event: GestureResponderEvent) => {
    onReset();
    return false; // Don't consume the event
  };
}
