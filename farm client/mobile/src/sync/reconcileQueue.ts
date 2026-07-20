import { AppDispatch, RootState } from '../store/store';
import { store } from '../store/store';
import { removeOperation, incrementRetryCount, setSyncing } from '../store/slices/syncSlice';
import { showToast } from '../store/slices/uiSlice';
import { apiClient } from '../services/api';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function reconcileOfflineQueue(dispatch: AppDispatch) {
  let stopped = false;

  async function run() {
    const state = store.getState() as RootState;
    const queue = state.sync.offlineQueue;

    if (queue.length === 0 || !state.sync.isOnline) return;

    dispatch(setSyncing(true));

    for (const op of queue) {
      if (stopped) break;

      if (op.retryCount >= MAX_RETRIES) {
        store.dispatch(
          showToast({
            id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            message: `A ${op.method} ${op.endpoint} change was dropped after too many failures. Please retry.`,
            type: 'warning',
            duration: 6000,
          })
        );
        dispatch(removeOperation(op.id));
        continue;
      }

      try {
        switch (op.method) {
          case 'POST':
            await apiClient.axiosInstance.post(op.endpoint, op.data);
            break;
          case 'PUT':
            await apiClient.axiosInstance.put(op.endpoint, op.data);
            break;
          case 'DELETE':
            await apiClient.axiosInstance.delete(op.endpoint);
            break;
        }
        dispatch(removeOperation(op.id));
      } catch {
        dispatch(incrementRetryCount(op.id));
        await delay(RETRY_DELAY_MS * (op.retryCount + 1));
      }
    }

    dispatch(setSyncing(false));
  }

  const interval = setInterval(() => {
    const state = store.getState() as RootState;
    if (state.sync.isOnline && state.sync.offlineQueue.length > 0 && !state.sync.syncing) {
      run();
    }
  }, 5000);

  run();

  return {
    stop() {
      stopped = true;
      clearInterval(interval);
    },
  };
}
