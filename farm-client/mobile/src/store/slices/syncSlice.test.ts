import syncReducer, {
  setSocketConnected,
  setIsOnline,
  setReconnectAttempt,
  enqueueOperation,
  removeOperation,
  incrementRetryCount,
  clearQueue,
  setSyncing,
  SyncState,
} from './syncSlice';

const initialState: SyncState = {
  socketConnected: false,
  isOnline: true,
  reconnectAttempt: 0,
  offlineQueue: [],
  syncing: false,
};

describe('syncSlice', () => {
  it('should return the initial state', () => {
    expect(syncReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('setSocketConnected', () => {
    it('sets connected to true', () => {
      const state = syncReducer(initialState, setSocketConnected(true));
      expect(state.socketConnected).toBe(true);
    });

    it('resets reconnectAttempt when connecting', () => {
      const state = syncReducer(
        { ...initialState, reconnectAttempt: 5 },
        setSocketConnected(true)
      );
      expect(state.reconnectAttempt).toBe(0);
    });

    it('does not reset reconnectAttempt when disconnecting', () => {
      const state = syncReducer(
        { ...initialState, reconnectAttempt: 5 },
        setSocketConnected(false)
      );
      expect(state.reconnectAttempt).toBe(5);
    });
  });

  describe('setIsOnline', () => {
    it('sets online status', () => {
      expect(syncReducer(initialState, setIsOnline(false)).isOnline).toBe(false);
      expect(syncReducer(initialState, setIsOnline(true)).isOnline).toBe(true);
    });
  });

  describe('setReconnectAttempt', () => {
    it('sets the attempt number', () => {
      const state = syncReducer(initialState, setReconnectAttempt(3));
      expect(state.reconnectAttempt).toBe(3);
    });
  });

  describe('enqueueOperation', () => {
    it('adds an operation with generated id, timestamp, and retryCount=0', () => {
      const state = syncReducer(
        initialState,
        enqueueOperation({
          method: 'POST',
          endpoint: '/farms',
          data: { name: 'Test Farm' },
          module: 'farms',
        })
      );
      expect(state.offlineQueue).toHaveLength(1);
      const op = state.offlineQueue[0];
      expect(op.id).toMatch(/^offline-\d+/);
      expect(op.method).toBe('POST');
      expect(op.endpoint).toBe('/farms');
      expect(op.data).toEqual({ name: 'Test Farm' });
      expect(op.module).toBe('farms');
      expect(op.retryCount).toBe(0);
      expect(op.createdAt).toBeGreaterThan(0);
    });

    it('appends multiple operations', () => {
      let state = syncReducer(initialState, enqueueOperation({
        method: 'POST', endpoint: '/farms', module: 'farms',
      }));
      state = syncReducer(state, enqueueOperation({
        method: 'PUT', endpoint: '/crops/1', module: 'crops',
      }));
      expect(state.offlineQueue).toHaveLength(2);
    });
  });

  describe('removeOperation', () => {
    it('removes the operation by id', () => {
      let state = syncReducer(initialState, enqueueOperation({
        method: 'POST', endpoint: '/farms', module: 'farms',
      }));
      const id = state.offlineQueue[0].id;
      state = syncReducer(state, removeOperation(id));
      expect(state.offlineQueue).toHaveLength(0);
    });

    it('does nothing for unknown id', () => {
      let state = syncReducer(initialState, enqueueOperation({
        method: 'POST', endpoint: '/farms', module: 'farms',
      }));
      state = syncReducer(state, removeOperation('nonexistent'));
      expect(state.offlineQueue).toHaveLength(1);
    });
  });

  describe('incrementRetryCount', () => {
    it('increments retry count for the matching operation', () => {
      let state = syncReducer(initialState, enqueueOperation({
        method: 'POST', endpoint: '/farms', module: 'farms',
      }));
      const id = state.offlineQueue[0].id;
      state = syncReducer(state, incrementRetryCount(id));
      expect(state.offlineQueue[0].retryCount).toBe(1);
      state = syncReducer(state, incrementRetryCount(id));
      expect(state.offlineQueue[0].retryCount).toBe(2);
    });
  });

  describe('clearQueue', () => {
    it('empties the queue', () => {
      let state = syncReducer(initialState, enqueueOperation({
        method: 'POST', endpoint: '/farms', module: 'farms',
      }));
      state = syncReducer(state, clearQueue());
      expect(state.offlineQueue).toHaveLength(0);
    });
  });

  describe('setSyncing', () => {
    it('sets syncing flag', () => {
      expect(syncReducer(initialState, setSyncing(true)).syncing).toBe(true);
    });
  });
});
