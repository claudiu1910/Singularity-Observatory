"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { formatScientific } from "@/lib/black-hole-targets";
import { Slider } from "@/components/ui/slider";

const G = 6.674e-11;
const C = 2.998e8;
const M_SUN = 1.989e30;
const G0 = 9.81;
const BODY_LENGTH_M = 2;

/** Head-to-toe tidal acceleration at the horizon: Δa = 2GM·L / rₛ³ = L·c⁶ / (4G²M²). */
function tidalAtHorizon(massSolar: number) {
  const m = massSolar * M_SUN;
  return (BODY_LENGTH_M * C ** 6) / (4 * G * G * m * m);
}

const PRESETS = [
  { label: "Stellar · 10 M☉", logM: 1 },
  { label: "Sgr A*", logM: Math.log10(4.15e6) },
  { label: "M87*", logM: Math.log10(6.5e9) },
];

function verdict(gs: number) {
  if (gs > 1e4) return { text: "Spaghettified long before the horizon.", tone: "text-rose-300" };
  if (gs > 20) return { text: "Lethal stretching at the horizon.", tone: "text-rose-300" };
  if (gs > 1) return { text: "Painful, but you'd cross intact.", tone: "text-ember" };
  return { text: "You wouldn't feel a thing crossing in.", tone: "text-emerald-300" };
}

function formatG(gs: number) {
  if (gs >= 1000 || gs < 0.01) return `${formatScientific(gs, 2)} g`;
  return `${gs.toFixed(gs < 1 ? 3 : 1)} g`;
}

export function Spaghettification() {
  const [logM, setLogM] = useState(1);
  const massSolar = 10 ** logM;
  const gs = tidalAtHorizon(massSolar) / G0;
  const v = verdict(gs);
  // Visual stretch grows with log(tidal g); purely illustrative.
  const stretch = Math.min(1 + Math.max(Math.log10(Math.max(gs, 1)), 0) * 0.24, 2.6);

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Tides depend on the <em>difference</em> in gravity between your head and feet. Counter-intuitively, the
        bigger the black hole, the gentler its horizon.
      </p>

      <div className="flex items-center gap-5 rounded-xl border border-border/60 bg-card/60 p-4">
        <svg viewBox="0 0 80 140" className="h-36 w-20 shrink-0" aria-hidden="true">
          <line x1="0" y1="132" x2="80" y2="132" stroke="currentColor" className="text-ember/60" strokeDasharray="3 3" />
          <g
            style={{
              transform: `scale(${1 / Math.sqrt(stretch)}, ${stretch})`,
              transformOrigin: "40px 132px",
              transition: "transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <circle cx="40" cy="92" r="7" className="fill-foreground/85" />
            <rect x="31" y="100" width="18" height="22" rx="6" className="fill-foreground/70" />
            <rect x="33" y="120" width="5" height="12" rx="2.5" className="fill-foreground/60" />
            <rect x="42" y="120" width="5" height="12" rx="2.5" className="fill-foreground/60" />
          </g>
        </svg>
        <div className="min-w-0 space-y-1">
          <p className="font-mono text-[11px] text-muted-foreground">Tidal stretch at the horizon (2 m body)</p>
          <p className="font-mono text-2xl text-foreground tabular-nums">{formatG(gs)}</p>
          <p className={cn("text-sm", v.tone)}>{v.text}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between font-mono text-xs">
          <span className="text-muted-foreground">Black hole mass</span>
          <span className="tabular-nums">{formatScientific(massSolar, 3)} M☉</span>
        </div>
        <Slider
          value={logM}
          min={0.5}
          max={10.5}
          step={0.01}
          onValueChange={(value) => setLogM(Array.isArray(value) ? value[0] : value)}
          aria-label="Black hole mass (log scale)"
          className="[&_[data-slot=slider-range]]:bg-ember"
        />
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setLogM(p.logM)}
              className={cn(
                "rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors",
                Math.abs(logM - p.logM) < 0.02
                  ? "border-ember/50 bg-ember/10 text-ember"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-border/60 pt-4">
        {PRESETS.map((p) => {
          const pg = tidalAtHorizon(10 ** p.logM) / G0;
          // Log-scaled bar from 1e-12 g to 1e8 g.
          const width = Math.min(Math.max((Math.log10(pg) + 12) / 20, 0.02), 1) * 100;
          return (
            <div key={p.label} className="grid grid-cols-[6.5rem_1fr_5.5rem] items-center gap-2 font-mono text-[11px]">
              <span className="text-muted-foreground">{p.label}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-ember/80" style={{ width: `${width}%` }} />
              </span>
              <span className="text-right tabular-nums">{formatG(pg)}</span>
            </div>
          );
        })}
        <p className="pt-1 text-[11px] text-muted-foreground">Log scale. Static observer at r = rₛ, Newtonian tidal estimate.</p>
      </div>
    </div>
  );
}
