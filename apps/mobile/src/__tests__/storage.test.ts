import { clearAllStorage } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('clearAllStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('removes all known keys', async () => {
    const store: Map<string, string> = (globalThis as any).__ASYNC_STORAGE_MOCK__;
    store.set('accessToken', 'acc');
    store.set('refreshToken', 'ref');
    store.set('user', '{}');
    store.set('mfaSessionToken', 'mfa');
    store.set('persist:ui', '{}');
    store.set('persist:auth', '{}');
    store.set('persist:sync', '{}');
    store.set('selectedIds', '{}');
    store.set('activeFilters', '{}');
    store.set('someOtherKey', 'keep');

    await clearAllStorage();

    expect(store.has('accessToken')).toBe(false);
    expect(store.has('refreshToken')).toBe(false);
    expect(store.has('user')).toBe(false);
    expect(store.has('mfaSessionToken')).toBe(false);
    expect(store.has('persist:ui')).toBe(false);
    expect(store.has('persist:auth')).toBe(false);
    expect(store.has('persist:sync')).toBe(false);
    expect(store.has('selectedIds')).toBe(false);
    expect(store.has('activeFilters')).toBe(false);
    expect(store.has('someOtherKey')).toBe(true); // not in the clear list
  });

  it('does not throw when storage is empty', async () => {
    await expect(clearAllStorage()).resolves.toBeUndefined();
  });

  it('calls AsyncStorage.multiRemove', async () => {
    await clearAllStorage();
    expect(AsyncStorage.multiRemove).toHaveBeenCalled();
  });
});
