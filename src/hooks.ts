import { useEffect, useState } from "react";

const DEBOUNCE_MS = 500;

export function useDebouncedValue<T>(
  value: T,
  delay: number = DEBOUNCE_MS,
): [T, boolean] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    setBouncing(true);

    const timeout = setTimeout(() => {
      setDebouncedValue(value);
      setBouncing(false);
    }, delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [value, delay]);

  return [debouncedValue, bouncing];
}
