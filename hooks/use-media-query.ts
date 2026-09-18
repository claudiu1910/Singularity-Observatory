"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Live result of a CSS media query. `serverValue` is used during server
 * rendering and hydration, so pick the value that matches the most common case.
 */
export function useMediaQuery(query: string, serverValue: boolean) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
