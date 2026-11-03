import '@testing-library/jest-dom/vitest';

/**
 * Node 22+ ships an experimental global `localStorage` that stays `undefined`
 * unless Node is started with `--localstorage-file`. Vitest syncs globals
 * between `window` and `globalThis`, so that `undefined` shadows jsdom's
 * storage and any test touching `localStorage` crashes with
 * "Cannot read properties of undefined". Install a self-contained in-memory
 * Storage on window and globalThis whenever storage is missing or unusable,
 * so hooks/components under test behave like they do in the browser.
 */
class MemoryStorage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    const value = this.store.get(key);
    return value === undefined ? null : value;
  }

  setItem(key: string, value: string): void {
    this.store.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const readStorage = (get: () => unknown): Storage | null => {
  try {
    const candidate = get();
    if (!candidate || typeof candidate !== 'object') return null;
    const storage = candidate as Storage;
    storage.setItem('__probe__', '1');
    storage.removeItem('__probe__');
    return storage;
  } catch {
    return null;
  }
};

const memoryStorage = new MemoryStorage();

if (
  typeof window !== 'undefined' &&
  !readStorage(() => window.localStorage)
) {
  Object.defineProperty(window, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
}

if (!readStorage(() => globalThis.localStorage)) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
}
