import { useState } from "react";

export function getLocalStorageItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setLocalStorageItem<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => getLocalStorageItem<T>(key, initialValue));

  // Écriture synchrone dans le setter pour que la valeur soit disponible immédiatement
  // même si le composant se démonte avant l'exécution d'un useEffect
  const setValueAndPersist = (action: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof action === "function" ? (action as (p: T) => T)(prev) : action;
      setLocalStorageItem(key, next);
      return next;
    });
  };

  return [value, setValueAndPersist] as const;
}
