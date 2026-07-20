import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns initial value when no stored value', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    const [value] = result.current;
    expect(value).toBe('default');
  });

  it('returns stored value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    const [value] = result.current;
    expect(value).toBe('stored');
  });

  it('sets value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    const [, setValue] = result.current;

    act(() => setValue('new-value'));

    const [value] = result.current;
    expect(value).toBe('new-value');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('new-value'));
  });

  it('sets value using updater function', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0));
    const [, setCounter] = result.current;

    act(() => setCounter((prev) => prev + 1));
    act(() => setCounter((prev) => prev + 1));

    const [value] = result.current;
    expect(value).toBe(2);
  });

  it('removes value from localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    const [, , removeValue] = result.current;

    act(() => removeValue());

    const [value] = result.current;
    expect(value).toBe('default');
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('handles objects', () => {
    const initial = { name: 'Test', count: 0 };
    const { result } = renderHook(() => useLocalStorage('obj', initial));
    const [, setValue] = result.current;

    act(() => setValue({ name: 'Updated', count: 5 }));

    const [value] = result.current;
    expect(value).toEqual({ name: 'Updated', count: 5 });
  });

  it('handles invalid JSON gracefully', () => {
    localStorage.setItem('bad-json', 'not-valid-json{{{');
    const { result } = renderHook(() => useLocalStorage('bad-json', 'fallback'));
    const [value] = result.current;
    expect(value).toBe('fallback');
  });
});
