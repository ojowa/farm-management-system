import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item !== null) setStoredValue(JSON.parse(item));
      } catch {}
    })();
  }, [key]);

  const setValue = useCallback(async (value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      AsyncStorage.setItem(key, JSON.stringify(valueToStore)).catch(() => {});
      return valueToStore;
    });
  }, [key]);

  const removeValue = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch {}
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
