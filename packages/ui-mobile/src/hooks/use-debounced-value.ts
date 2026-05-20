import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has stayed unchanged for `delayMs`. Each change
 * resets the timer, so a burst of rapid updates only emits the final value.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
