"use client";

import { Activity, Move } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { formatScientific, TARGETS, type BlackHoleTarget } from "@/lib/black-hole-targets";
import { kerrIscoRs, schwarzschildRadius } from "@/components/ui/optimized-black-hole-utils/physics";

interface TargetHudProps {
  active: BlackHoleTarget;
  onTargetChange: (target: BlackHoleTarget) => void;
  className?: string;
  /** Compact chip-only variant for small screens. */
  compact?: boolean;
}

interface Readout {
  logMass: number;
  spin: number;
}

const ANIMATION_MS = 900;

/** Animates readouts between targets; mass interpolates in log space so 10⁶ → 10⁹ reads naturally. */
function useAnimatedReadout(target: BlackHoleTarget): Readout {
  const [readout, setReadout] = useState<Readout>(() => ({
    logMass: Math.log10(target.massSolar),
    spin: target.spin,
  }));
  // Last value shown, so a new animation starts from wherever the previous one got to.
  const shown = useRef(readout);

  useEffect(() => {
    const start = shown.current;
    const end = { logMass: Math.log10(target.massSolar), spin: target.spin };
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ANIMATION_MS;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = duration ? Math.min((now - t0) / duration, 1) : 1;
      const e = 1 - Math.pow(1 - t, 3);
      shown.current = {
        logMass: start.logMass + (end.logMass - start.logMass) * e,
        spin: start.spin + (end.spin - start.spin) * e,
      };
      setReadout(shown.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return readout;
}

export function TargetButtons({
  active,
  onTargetChange,
  size,
}: {
  active: BlackHoleTarget | null;
  onTargetChange: (target: BlackHoleTarget) => void;
  size: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label="Black hole target" className="flex gap-1.5">
      {TARGETS.map((t) => {
        const selected = t.id === active?.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onTargetChange(t)}
            className={cn(
              "flex-1 rounded-lg border px-2 font-mono transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ember/60",
              size === "md" ? "py-1.5 text-[11px]" : "py-1 text-[10px]",
              selected
                ? "border-ember/50 bg-ember/15 text-ember shadow-[0_0_18px_-6px_var(--ember)]"
                : "border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white",
            )}
          >
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

/** "Live target" HUD: switch presets and watch the physical readouts animate. */
export function TargetHud({ active, onTargetChange, className, compact }: TargetHudProps) {
  const { logMass, spin } = useAnimatedReadout(active);
  const mass = 10 ** logMass;

  if (compact) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/10 bg-black/45 p-1.5 backdrop-blur-md",
          className,
        )}
      >
        <TargetButtons active={active} onTargetChange={onTargetChange} size="sm" />
        <p className="mt-1.5 text-center font-mono text-[10px] text-white/55 tabular-nums">
          {formatScientific(mass)} M☉ · a* {spin.toFixed(3)}
        </p>
      </div>
    );
  }

  const rows: Array<[string, string]> = [
    ["Mass", `${formatScientific(mass)} M☉`],
    ["Schwarzschild r", `${formatScientific(schwarzschildRadius(mass), 2)} m`],
    ["Spin a*", spin.toFixed(3)],
    ["ISCO (prograde)", `${kerrIscoRs(spin).toFixed(2)} rₛ`],
  ];

  return (
    <aside
      className={cn(
        "w-80 rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-[11px] text-white/60 backdrop-blur-md",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between text-white/80">
        <span className="flex items-center gap-1.5">
          <Activity className="size-3.5 text-ember" /> LIVE TARGET
        </span>
        <span key={active.id} className="animate-in text-white/45 duration-500 fade-in">
          {active.kind}
        </span>
      </div>

      <TargetButtons active={active} onTargetChange={onTargetChange} size="md" />

      <dl className="mt-3.5 space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt>{k}</dt>
            <dd className="text-white/90 tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[10px] text-white/35">Spin: {active.spinNote}.</p>

      <p className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3 text-white/40">
        <Move className="size-3" /> Drag the field to orbit
      </p>
    </aside>
  );
}
