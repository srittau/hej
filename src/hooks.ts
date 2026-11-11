import { useEffect, useState } from "react";

const DEBOUNCE_MS = 500;

/**
 * Debounce a value.
 *
 * The returned debounced value follows `value`, but only updates once
 * `value` has stopped changing for `delay` milliseconds.
 *
 * @param value The value to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns A tuple of the debounced value and a flag that is `true` while
 *   the debounced value is lagging behind `value`.
 */
export function useDebouncedValue<T>(
  value: T,
  delay: number = DEBOUNCE_MS,
): [T, boolean] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [value, delay]);

  return [debouncedValue, !Object.is(value, debouncedValue)];
}
