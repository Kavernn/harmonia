import { useEffect, useState } from "react";

function readStoredValue<T>(key: string, initialValue: T) {
  if (typeof window === "undefined") return initialValue;

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return initialValue;
    return JSON.parse(raw) as T;
  } catch {
    return initialValue;
  }
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => readStoredValue(key, initialValue));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage failures and keep the in-memory state.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
