"use client";

import { useCallback, useState } from "react";

import BlackHole from "@/components/ui/optimized-black-hole";
import { DEFAULT_TARGET, type BlackHoleTarget } from "@/lib/black-hole-targets";
import { TargetHud } from "@/components/landing/target-hud";

/** Lift the hole and pull back slightly so the title sits below the lensed ring. */
const HERO_FRAMING = { offsetY: 0.17, zoom: 0.84 };

/**
 * Full-viewport hero: the black hole backdrop, legibility gradients and the
 * live-target HUD. Copy is passed in as children so it stays server-rendered.
 */
export function HeroStage({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<BlackHoleTarget>(DEFAULT_TARGET);
  const onTargetChange = useCallback((next: BlackHoleTarget) => setTarget(next), []);

  return (
    <section id="top" className="relative isolate h-[100svh] min-h-[640px] w-full overflow-hidden bg-black">
      <div className="absolute inset-0 -z-10">
        <BlackHole params={target.view} framing={HERO_FRAMING} />
      </div>
      {/* Legibility gradients; non-interactive so the canvas stays draggable. */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-black/50 via-transparent via-45% to-background" />
      {/* On touch screens, cover the canvas so vertical swipes scroll the page. */}
      <div className="absolute inset-0 -z-10 md:hidden" aria-hidden="true" />

      <div className="pointer-events-none relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-14 sm:px-8 sm:pb-20">
        {/* Small screens: compact switcher sits in the copy column, in place of the eyebrow. */}
        <TargetHud
          compact
          active={target}
          onTargetChange={onTargetChange}
          className="pointer-events-auto mb-5 w-full max-w-sm animate-in delay-700 duration-1000 fill-mode-both fade-in lg:hidden"
        />
        {children}
        <TargetHud
          active={target}
          onTargetChange={onTargetChange}
          className="pointer-events-auto absolute right-8 bottom-20 hidden animate-in delay-700 duration-1000 fill-mode-both fade-in slide-in-from-right-4 lg:block"
        />
      </div>

    </section>
  );
}
