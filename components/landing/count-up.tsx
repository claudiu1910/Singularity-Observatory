"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
}

const format = (n: number, decimals: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * Counts from zero to `value` when scrolled into view. Server-renders the final
 * value so it reads correctly without JavaScript and for crawlers.
 */
export function CountUp({ value, decimals = 0, prefix = "", suffix = "", durationMs = 1600 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / durationMs, 1);
          const eased = 1 - Math.pow(1 - t, 4);
          setDisplay(value * eased);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    // Only animate if it starts off-screen, so nothing visibly snaps back to 0.
    if (el.getBoundingClientRect().top > window.innerHeight) {
      setDisplay(0);
      observer.observe(el);
    }
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {format(display, decimals)}
      {suffix}
    </span>
  );
}
