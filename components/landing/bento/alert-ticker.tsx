"use client";

import { Radio, Sparkle, Waves, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type AlertKind = "GW" | "TDE" | "FRB" | "GRB";

interface Alert {
  id: number;
  kind: AlertKind;
  name: string;
  detail: string;
  /** Seconds since the alert was issued. */
  age: number;
}

const KIND_META: Record<AlertKind, { icon: typeof Waves; tone: string }> = {
  GW: { icon: Waves, tone: "text-ember bg-ember/10 ring-ember/25" },
  TDE: { icon: Sparkle, tone: "text-rose-300 bg-rose-400/10 ring-rose-400/25" },
  FRB: { icon: Radio, tone: "text-sky-300 bg-sky-400/10 ring-sky-400/25" },
  GRB: { icon: Zap, tone: "text-violet-300 bg-violet-400/10 ring-violet-400/25" },
};

/** UTC time-of-day for the n-th alert, as hhmmss (GW event naming: GWYYMMDD_hhmmss). */
function hhmmss(n: number) {
  const s = (11524 + n * 1373) % 86400;
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((v) => String(v).padStart(2, "0")).join("");
}

// Mock catalogue cycled deterministically so server and client render the same first frame.
const TEMPLATES: Array<Omit<Alert, "id" | "age" | "name"> & { name: (n: number) => string }> = [
  { kind: "GW", name: (n) => `GW260918_${hhmmss(n)}`, detail: "Kilonova candidate · z = 0.04" },
  { kind: "TDE", name: (n) => `AT2026x${"kqrsvw"[n % 6]}${"abcd"[n % 4]}`, detail: "Tidal disruption flare · z = 0.021" },
  { kind: "FRB", name: (n) => `FRB 20260918${"ABCDEFGH"[n % 8]}`, detail: "Repeating burst · DM 412 pc cm⁻³" },
  { kind: "GW", name: (n) => `GW260918_${hhmmss(n + 7)}`, detail: "BBH merger · 62 M☉ remnant" },
  { kind: "GRB", name: (n) => `GRB 260918${"ABCDEFGH"[(n + 3) % 8]}`, detail: "Short GRB · Swift/BAT trigger" },
  { kind: "TDE", name: (n) => `ZTF26aa${"xyzq"[n % 4]}${"klmn"[n % 4]}`, detail: "Nuclear transient · z = 0.11" },
];

const VISIBLE = 5;
const INTERVAL_MS = 3200;

function makeAlert(n: number, age: number): Alert {
  const t = TEMPLATES[n % TEMPLATES.length];
  return { id: n, kind: t.kind, name: t.name(n), detail: t.detail, age };
}

const INITIAL: Alert[] = Array.from({ length: VISIBLE }, (_, i) => makeAlert(VISIBLE - 1 - i, 8 + i * 23));

function formatAge(s: number) {
  if (s < 5) return "now";
  if (s < 60) return `${Math.floor(s)}s`;
  return `${Math.floor(s / 60)}m`;
}

/** Live-ticker style list of simulated multi-messenger alerts. */
export function AlertTicker() {
  const [alerts, setAlerts] = useState(INITIAL);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let next = VISIBLE;
    const ageTimer = window.setInterval(() => {
      setAlerts((list) => list.map((a) => ({ ...a, age: a.age + 1 })));
    }, 1000);
    const pushTimer = window.setInterval(() => {
      const alert = makeAlert(next++, 0);
      setAlerts((list) => [alert, ...list].slice(0, VISIBLE));
    }, INTERVAL_MS);
    return () => {
      clearInterval(ageTimer);
      clearInterval(pushTimer);
    };
  }, []);

  return (
    <ol aria-live="off" aria-label="Simulated transient alerts" className="space-y-1.5">
      {alerts.map((a, i) => {
        const { icon: Icon, tone } = KIND_META[a.kind];
        return (
          <li
            key={a.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-2.5 py-2 transition-colors duration-700",
              a.age < 2 ? "animate-in border-ember/30 bg-ember/5 duration-500 fade-in slide-in-from-top-2" : "border-white/5 bg-white/[0.02]",
              i === VISIBLE - 1 && "opacity-50",
            )}
          >
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md ring-1", tone)}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[11px] text-foreground/90">
                {a.name} <span className="text-muted-foreground">· {a.kind}</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">{a.detail}</p>
            </div>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">{formatAge(a.age)}</span>
          </li>
        );
      })}
    </ol>
  );
}
