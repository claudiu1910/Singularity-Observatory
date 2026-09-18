"use client";

import { useEffect, useRef, useState } from "react";

import { Slider } from "@/components/ui/slider";
import { timeDilationFactor } from "@/components/ui/optimized-black-hole-utils/physics";

/** Local seconds per visual revolution of "your" clock hand. */
const LOCAL_PERIOD_S = 6;
/** Keep the distant hand readable even at extreme dilation. */
const MAX_VISUAL_RATIO = 40;

function formatDuration(hours: number) {
  if (hours < 48) return `${hours < 10 ? hours.toFixed(2) : hours.toFixed(1)} hours`;
  const days = hours / 24;
  if (days < 730) return `${days.toFixed(days < 10 ? 1 : 0)} days`;
  const years = days / 365.25;
  return `${years < 100 ? years.toFixed(1) : Math.round(years).toLocaleString("en-US")} years`;
}

function Clock({ label, handRef }: { label: string; handRef: React.Ref<SVGLineElement> }) {
  return (
    <figure className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 64 64" className="size-20" aria-hidden="true">
        <circle cx="32" cy="32" r="29" className="fill-card stroke-border" strokeWidth="1.5" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={32 + Math.sin(a) * 24}
              y1={32 - Math.cos(a) * 24}
              x2={32 + Math.sin(a) * 27}
              y2={32 - Math.cos(a) * 27}
              className="stroke-muted-foreground"
              strokeWidth={i % 3 === 0 ? 1.5 : 0.8}
            />
          );
        })}
        <line ref={handRef} x1="32" y1="32" x2="32" y2="8" className="stroke-ember" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="32" r="2.5" className="fill-ember" />
      </svg>
      <figcaption className="font-mono text-[11px] text-muted-foreground">{label}</figcaption>
    </figure>
  );
}

export function TimeDilation() {
  // Slider works in log10(r/rₛ − 1) so the dramatic region near the horizon gets room.
  const [x, setX] = useState(-0.3);
  const r = 1 + 10 ** x;
  const rate = timeDilationFactor(r);
  const factor = 1 / rate;

  const localHand = useRef<SVGLineElement>(null);
  const farHand = useRef<SVGLineElement>(null);
  const factorRef = useRef(factor);
  useEffect(() => {
    factorRef.current = factor;
  }, [factor]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = 0;
    let local = 0;
    let far = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      local += (dt / LOCAL_PERIOD_S) * 360;
      far += (dt / LOCAL_PERIOD_S) * 360 * Math.min(factorRef.current, MAX_VISUAL_RATIO);
      localHand.current?.setAttribute("transform", `rotate(${local % 360} 32 32)`);
      farHand.current?.setAttribute("transform", `rotate(${far % 360} 32 32)`);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Diagram: horizon at radius 18, observer placed on a log-ish scale.
  const dotR = 18 + Math.min(Math.log10(r) * 70, 80);

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Hover near a horizon and your clock runs slow compared with someone far away. Slide closer and watch
        the gap explode.
      </p>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-4">
        <Clock label="Your clock" handRef={localHand} />
        <svg viewBox="0 0 120 120" className="size-24" aria-hidden="true">
          <circle cx="60" cy="60" r="18" className="fill-black stroke-ember/70" strokeWidth="1.5" />
          <circle cx="60" cy="60" r="27" fill="none" className="stroke-ember/25" strokeDasharray="2 3" />
          <circle cx={Math.min(60 + dotR, 116)} cy="60" r="3.5" className="fill-foreground" style={{ transition: "cx 300ms ease" }} />
        </svg>
        <Clock label="Distant observer" handRef={farHand} />
      </div>

      <div className="rounded-xl border border-ember/25 bg-ember/5 p-4 text-center">
        <p className="font-mono text-[11px] text-muted-foreground">1 hour for you ≈</p>
        <p className="mt-1 font-mono text-2xl text-ember tabular-nums">{formatDuration(factor)}</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">for a distant observer · ×{factor.toFixed(factor < 10 ? 3 : 1)}</p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between font-mono text-xs">
          <span className="text-muted-foreground">Distance from centre</span>
          <span className="tabular-nums">
            r = {r < 1.01 ? r.toFixed(4) : r.toFixed(2)} rₛ
          </span>
        </div>
        <Slider
          value={x}
          min={-4}
          max={1.3}
          step={0.01}
          onValueChange={(value) => setX(Array.isArray(value) ? value[0] : value)}
          aria-label="Distance from the event horizon"
          className="[&_[data-slot=slider-range]]:bg-ember"
        />
        <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>at the horizon</span>
          <span>far away</span>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Static observer outside a non-spinning hole: dτ/dt = √(1 − rₛ/r). Interstellar&apos;s Miller&apos;s planet (1 h ≈ 7 years)
        needs Gargantua&apos;s near-extremal spin to orbit that deep.
      </p>
    </div>
  );
}
