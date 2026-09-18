"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  /** Tilt towards the pointer; best on small cards. */
  tilt?: boolean;
}

const MAX_TILT_DEG = 5;

/** Card with a cursor-following ember glow and a slight 3D tilt towards the pointer. */
export function SpotlightCard({ children, className, tilt = true }: SpotlightCardProps) {
  const ref = useRef<HTMLElement>(null);

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--spot-x", `${x * 100}%`);
    el.style.setProperty("--spot-y", `${y * 100}%`);
    if (!tilt) return;
    el.style.setProperty("--tilt-x", `${(0.5 - y) * MAX_TILT_DEG}deg`);
    el.style.setProperty("--tilt-y", `${(x - 0.5) * MAX_TILT_DEG}deg`);
  };

  const onPointerLeave = () => {
    ref.current?.style.setProperty("--tilt-x", "0deg");
    ref.current?.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <article
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn(
        "group relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card p-7",
        "transition-all duration-300 ease-out hover:border-ember/40",
        "[transform:perspective(900px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] motion-reduce:[transform:none]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 50%), var(--ember-soft), transparent 60%)",
        }}
      />
      {children}
    </article>
  );
}
