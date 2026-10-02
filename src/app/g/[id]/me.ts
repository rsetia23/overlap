import { useCallback, useSyncExternalStore } from "react";

// Which name in a group is "you" on this device. It's only a convenience
// (your section opens first, edit buttons show on your calendars), not
// security: anyone can pick any name.
const key = (groupId: string) => `overlap:me:${groupId}`;
const listeners = new Set<() => void>();

function read(groupId: string): string | null {
  try {
    return localStorage.getItem(key(groupId));
  } catch {
    return null;
  }
}

export function rememberMe(groupId: string, personId: string | null) {
  try {
    if (personId) localStorage.setItem(key(groupId), personId);
    else localStorage.removeItem(key(groupId));
  } catch {
    // Private mode or blocked storage: you'll be asked again next visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useMe(groupId: string) {
  const me = useSyncExternalStore(subscribe, () => read(groupId), () => null);
  const setMe = useCallback((personId: string | null) => rememberMe(groupId, personId), [groupId]);
  return [me, setMe] as const;
}
