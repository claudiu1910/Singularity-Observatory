"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";

function scrollToId(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
}

/** Hero copy that drifts up and fades as the black hole scrolls away. */
export function HeroContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const p = Math.min(window.scrollY / window.innerHeight, 1);
      el.style.transform = `translate3d(0, ${p * -60}px, 0)`;
      el.style.opacity = String(1 - p * 1.2);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="relative will-change-transform">
      {children}
    </div>
  );
}

export function HeroActions() {
  const router = useRouter();
  return (
    <div className="pointer-events-auto mt-9 flex flex-wrap items-center gap-4">
      <LiquidMetalButton label="Start observing" onClick={() => router.push("/observatory")} />
      <button
        type="button"
        onClick={() => scrollToId("platform")}
        className="group inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-white/75 transition-colors hover:bg-white/8 hover:text-white"
      >
        Explore the platform
        <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-y-0.5">
          ↓
        </span>
      </button>
    </div>
  );
}

export function AccessActions() {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <LiquidMetalButton label="Request access" onClick={() => router.push("/access")} />
      <Link
        href="/pipeline"
        className="inline-flex h-11 items-center rounded-full border border-border bg-background/40 px-5 text-sm font-medium backdrop-blur-sm transition-colors hover:border-ember/40 hover:bg-muted"
      >
        Explore the pipeline
      </Link>
    </div>
  );
}
