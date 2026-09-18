"use client";

import { useMediaQuery } from "@/hooks/use-media-query";

/** Live `prefers-reduced-motion` value; `false` during server rendering. */
export function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)", false);
}
