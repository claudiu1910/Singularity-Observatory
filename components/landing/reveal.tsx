"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in ms. */
  delay?: number;
  as?: "div" | "li" | "section";
}

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-[opacity,translate,filter] duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-none",
        shown ? "translate-y-0 opacity-100 blur-none" : "translate-y-6 opacity-0 blur-[2px]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
