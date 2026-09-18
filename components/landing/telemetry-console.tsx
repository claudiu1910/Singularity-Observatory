"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";

type Line = { text: string; tone?: "muted" | "ok" | "accent" };

const STEPS: Array<Line & { waitMs: number }> = [
  { text: "▸ connecting to eht-federated (8 stations)", tone: "muted", waitMs: 450 },
  { text: "▸ loaded run 2026-09-18T03:12Z · M87* · 4.1 TB", tone: "muted", waitMs: 650 },
  { text: "▸ calibrating phase & gain solutions … done", tone: "muted", waitMs: 700 },
  { text: "▸ ray-tracing 1.2 M geodesics (kerr)", tone: "muted", waitMs: 200 },
];
const RESULT: Line[] = [
  { text: "✓ spin a* = 0.94 ± 0.05", tone: "ok" },
  { text: "✓ inclination i = 17° ± 2°", tone: "ok" },
  { text: "✓ χ²ᵣ = 1.03 · converged in 41 s (sim.)", tone: "accent" },
];

const TRACE_MS = 1400;
const KW = "text-ember";
const STR = "text-emerald-300";
const CMT = "text-white/35";

type Status = "idle" | "running" | "done";

function renderLine(line: Line, i: number) {
  return (
    <div
      key={i}
      className={cn(
        "animate-in fade-in slide-in-from-bottom-1 duration-300",
        line.tone === "muted" && "text-white/55",
        line.tone === "ok" && "text-emerald-300",
        line.tone === "accent" && "text-ember",
      )}
    >
      {line.text}
    </div>
  );
}

/** Code sample with a runnable, entirely simulated model fit. */
export function TelemetryConsole() {
  const [status, setStatus] = useState<Status>("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [progress, setProgress] = useState(0);
  const timers = useRef<number[]>([]);
  const raf = useRef(0);
  const outputRef = useRef<HTMLDivElement>(null);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    cancelAnimationFrame(raf.current);
  };
  useEffect(() => clearTimers, []);

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [lines, progress]);

  const run = () => {
    if (status === "running") return;
    clearTimers();
    setLines([]);
    setProgress(0);
    setStatus("running");

    let at = 0;
    STEPS.forEach((step) => {
      at += step.waitMs;
      timers.current.push(window.setTimeout(() => setLines((l) => [...l, step]), at));
    });

    timers.current.push(
      window.setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / TRACE_MS, 1);
          setProgress(t);
          if (t < 1) {
            raf.current = requestAnimationFrame(tick);
            return;
          }
          RESULT.forEach((line, i) => {
            timers.current.push(
              window.setTimeout(() => {
                setLines((l) => [...l, line]);
                if (i === RESULT.length - 1) setStatus("done");
              }, 180 * (i + 1)),
            );
          });
        };
        raf.current = requestAnimationFrame(tick);
      }, at + 100),
    );
  };

  const bar = Math.round(progress * 24);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-black shadow-2xl shadow-ember/5">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="ml-3 font-mono text-xs text-white/40">resolve_target.py</span>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase transition-colors",
            status === "idle" && "bg-white/5 text-white/40",
            status === "running" && "bg-ember/15 text-ember",
            status === "done" && "bg-emerald-400/10 text-emerald-300",
          )}
        >
          {status === "idle" ? "ready" : status === "running" ? "running" : "complete"}
        </span>
      </div>

      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-white/75">
        <code>
          <span className={CMT}># Fit a Kerr metric to tonight&apos;s VLBI run</span>
          {"\n"}
          <span className={KW}>from</span> singularity <span className={KW}>import</span> Observatory
          {"\n\n"}
          obs = Observatory.connect(<span className={STR}>&quot;eht-federated&quot;</span>)
          {"\n"}
          run = obs.runs.latest(target=<span className={STR}>&quot;M87*&quot;</span>)
          {"\n\n"}
          model = run.resolve(metric=<span className={STR}>&quot;kerr&quot;</span>, fit=[
          <span className={STR}>&quot;spin&quot;</span>, <span className={STR}>&quot;inclination&quot;</span>])
          {"\n"}
          <span className={KW}>print</span>(model.summary())
        </code>
      </pre>

      <div className="flex items-center gap-4 border-t border-white/10 px-5 py-4">
        <LiquidMetalButton viewMode="icon" label={status === "done" ? "Run again" : "Run model"} onClick={run} />
        <p className="font-mono text-xs text-white/45">
          {status === "idle" && "Press run to resolve the target →"}
          {status === "running" && "Resolving…"}
          {status === "done" && "Model resolved. Press again to re-run."}
        </p>
      </div>

      <div
        ref={outputRef}
        aria-live="polite"
        className={cn(
          "overflow-y-auto border-t border-white/10 bg-white/[0.02] px-5 font-mono text-[12.5px] leading-6 transition-[max-height,padding] duration-500 ease-out",
          status === "idle" ? "max-h-0 py-0" : "max-h-60 py-4",
        )}
      >
        {lines.slice(0, STEPS.length).map(renderLine)}
        {status !== "idle" && progress > 0 && (
          <div className="whitespace-pre text-white/55">
            {"  "}[<span className="text-ember">{"█".repeat(bar)}</span>
            <span className="text-white/15">{"░".repeat(24 - bar)}</span>] {Math.round(progress * 100)}%
          </div>
        )}
        {lines.slice(STEPS.length).map((line, i) => renderLine(line, STEPS.length + i))}
      </div>
    </div>
  );
}
