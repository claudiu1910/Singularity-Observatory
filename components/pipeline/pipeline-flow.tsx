"use client";

import { Pause, Play, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  EDGES,
  edgePath,
  layout,
  NODES,
  SINK_IDS,
  STATION_IDS,
  VIEWBOX,
  type FlowNode,
  type Orientation,
} from "@/components/pipeline/pipeline-data";

type PacketKind = "raw" | "visibility" | "calibrated" | "model" | "alert" | "transient";

interface Packet {
  edgeId: string;
  dist: number;
  length: number;
  speed: number;
  kind: PacketKind;
  el: SVGCircleElement;
}

const PACKET_STYLE: Record<PacketKind, { fill: string; r: number }> = {
  raw: { fill: "#cbd5e1", r: 4 },
  visibility: { fill: "#93c5fd", r: 4.5 },
  calibrated: { fill: "#f0a448", r: 5 },
  model: { fill: "#ffd9a0", r: 5.5 },
  alert: { fill: "#6ee7b7", r: 5 },
  transient: { fill: "#fda4af", r: 8 },
};

const LEGEND: Array<[PacketKind, string]> = [
  ["raw", "Raw VLBI packet"],
  ["calibrated", "Calibrated data"],
  ["model", "Fitted model"],
  ["alert", "Alert"],
  ["transient", "Injected transient"],
];

/** Which packet kind travels each outgoing edge of a node. */
function kindForEdge(edgeId: string): PacketKind {
  if (edgeId.endsWith("-ingest")) return "raw";
  if (edgeId === "ingest-calibrate") return "visibility";
  if (edgeId === "calibrate-raytrace") return "calibrated";
  if (edgeId === "raytrace-alerts") return "model";
  return "alert";
}

/** Fraction of packets that continue past each stage (data reduction). */
const CONTINUE_P: Record<string, number> = { ingest: 0.5, calibrate: 0.6, raytrace: 0.5 };

const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<string, FlowNode>;
const END_TO_END_S = ["alma", "ingest", "calibrate", "raytrace", "alerts"].reduce(
  (sum, id) => sum + NODE_BY_ID[id].latencyS,
  0,
);

interface LogEntry {
  id: number;
  text: string;
}

export function PipelineFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [selected, setSelected] = useState("raytrace");
  const [hovered, setHovered] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  // null = follow the motion preference until the user presses play/pause.
  const [pausedChoice, setPausedChoice] = useState<boolean | null>(null);
  const paused = pausedChoice ?? reducedMotion;
  const [rate, setRate] = useState(8);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [log, setLog] = useState<LogEntry[]>([]);

  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const nodeRefs = useRef<Record<string, SVGRectElement | null>>({});
  const packetLayer = useRef<SVGGElement>(null);
  const pausedRef = useRef(paused);
  const rateRef = useRef(rate);
  const injectRef = useRef<() => void>(() => {});

  useEffect(() => {
    pausedRef.current = paused;
    rateRef.current = rate;
  }, [paused, rate]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setOrientation(entry.contentRect.width < 720 ? "vertical" : "horizontal");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nodes = useMemo(() => layout(orientation), [orientation]);
  const vb = VIEWBOX[orientation];

  // Packet simulation: imperative SVG updates, no React re-render per frame.
  useEffect(() => {
    const layer = packetLayer.current;
    if (!layer) return;
    const packets: Packet[] = [];
    const counters: Record<string, number> = {};
    const lastPulse: Record<string, number> = {};
    let spawnAcc = 0;
    let raf = 0;
    let last = 0;
    let visible = true;
    let logId = 0;

    const spawn = (edgeId: string, kind: PacketKind) => {
      const path = pathRefs.current[edgeId];
      if (!path) return;
      const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      const style = PACKET_STYLE[kind];
      el.setAttribute("r", String(style.r));
      el.setAttribute("fill", style.fill);
      const start = path.getPointAtLength(0);
      el.setAttribute("cx", String(start.x));
      el.setAttribute("cy", String(start.y));
      layer.appendChild(el);
      packets.push({
        edgeId,
        dist: 0,
        length: path.getTotalLength(),
        speed: (kind === "transient" ? 210 : 120 + Math.random() * 60) * (orientation === "vertical" ? 1.1 : 1),
        kind,
        el,
      });
    };

    const pulse = (nodeId: string, now: number) => {
      const rect = nodeRefs.current[nodeId];
      if (!rect || now - (lastPulse[nodeId] ?? 0) < 140) return;
      lastPulse[nodeId] = now;
      rect.animate([{ strokeOpacity: 1, strokeWidth: 2.4 }, { strokeOpacity: 0.35, strokeWidth: 1 }], {
        duration: 500,
        easing: "ease-out",
      });
    };

    const arrive = (p: Packet, now: number) => {
      const edge = EDGES.find((e) => e.id === p.edgeId);
      if (!edge) return;
      const node = edge.to;
      counters[node] = (counters[node] ?? 0) + 1;
      pulse(node, now);
      const transient = p.kind === "transient";

      if (node === "alerts") {
        const sinks = transient ? SINK_IDS : [SINK_IDS[Math.floor(Math.random() * SINK_IDS.length)]];
        sinks.forEach((s) => spawn(`alerts-${s}`, transient ? "transient" : "alert"));
        if (transient) {
          setLog((l) =>
            [
              {
                id: logId++,
                text: `Transient classified and broadcast to GCN, webhooks and the data lake · end-to-end ${END_TO_END_S} s (simulated)`,
              },
              ...l,
            ].slice(0, 4),
          );
        }
        return;
      }
      const next = EDGES.find((e) => e.from === node);
      if (!next) return;
      if (transient || Math.random() < (CONTINUE_P[node] ?? 1)) {
        spawn(next.id, transient ? "transient" : kindForEdge(next.id));
      }
    };

    injectRef.current = () => {
      const station = STATION_IDS[Math.floor(Math.random() * STATION_IDS.length)];
      spawn(`${station}-ingest`, "transient");
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      if (!visible || document.hidden || pausedRef.current) return;

      spawnAcc += rateRef.current * dt;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        spawn(`${STATION_IDS[Math.floor(Math.random() * STATION_IDS.length)]}-ingest`, "raw");
      }

      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.dist += p.speed * dt;
        if (p.dist >= p.length) {
          p.el.remove();
          packets.splice(i, 1);
          arrive(p, now);
          continue;
        }
        const pt = pathRefs.current[p.edgeId]?.getPointAtLength(p.dist);
        if (pt) {
          p.el.setAttribute("cx", pt.x.toFixed(1));
          p.el.setAttribute("cy", pt.y.toFixed(1));
        }
      }
    };
    raf = requestAnimationFrame(tick);

    const flush = window.setInterval(() => setCounts({ ...counters }), 500);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      last = 0;
    });
    io.observe(layer.ownerSVGElement ?? layer);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(flush);
      io.disconnect();
      packets.forEach((p) => p.el.remove());
      injectRef.current = () => {};
    };
  }, [orientation]);

  const active = hovered ?? selected;
  const detail = NODE_BY_ID[selected];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card/40">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3">
          <button
            type="button"
            onClick={() => setPausedChoice(!paused)}
            aria-pressed={!paused}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs transition-colors hover:border-ember/40"
          >
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            {paused ? "Play flow" : "Pause flow"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (paused) setPausedChoice(false);
              injectRef.current();
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-rose-300/90 px-3 text-xs font-medium text-black transition-transform hover:scale-[1.03] active:scale-95"
          >
            <Zap className="size-3.5" /> Inject transient
          </button>
          <div className="ml-auto flex min-w-48 flex-1 items-center gap-3 sm:max-w-64">
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              Ingest {rate}/s
            </span>
            <Slider
              value={rate}
              min={1}
              max={24}
              step={1}
              aria-label="Ingest rate, packets per second"
              onValueChange={(v) => setRate(Array.isArray(v) ? v[0] : (v as number))}
              className="[&_[data-slot=slider-range]]:bg-ember"
            />
          </div>
        </div>

        <div ref={containerRef} className="p-2 sm:p-4">
          <svg
            viewBox={`0 0 ${vb.w} ${vb.h}`}
            className="h-auto w-full"
            role="group"
            aria-label="Dataflow from VLBI stations to alert subscribers"
          >
            <defs>
              <filter id="packet-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="2.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {EDGES.map((e) => {
              const lit = e.from === active || e.to === active;
              return (
                <path
                  key={`${orientation}-${e.id}`}
                  ref={(el) => {
                    pathRefs.current[e.id] = el;
                  }}
                  d={edgePath(nodes[e.from], nodes[e.to], orientation)}
                  fill="none"
                  className={cn("transition-[stroke,stroke-opacity] duration-300", lit ? "stroke-ember" : "stroke-white")}
                  strokeOpacity={lit ? 0.6 : 0.12}
                  strokeWidth={lit ? 1.6 : 1.2}
                  strokeDasharray={e.from === "alerts" ? "4 4" : undefined}
                />
              );
            })}

            <g ref={packetLayer} filter="url(#packet-glow)" />

            {NODES.map((n) => {
              const box = nodes[n.id];
              const isSelected = n.id === selected;
              const isStage = n.kind === "stage";
              const count = counts[n.id];
              return (
                <g
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${n.label}: ${n.sub}`}
                  onClick={() => setSelected(n.id)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      setSelected(n.id);
                    }
                  }}
                  onPointerEnter={() => setHovered(n.id)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(n.id)}
                  onBlur={() => setHovered(null)}
                  className="group cursor-pointer outline-none"
                >
                  <rect
                    ref={(el) => {
                      nodeRefs.current[n.id] = el;
                    }}
                    x={box.x - box.w / 2}
                    y={box.y - box.h / 2}
                    width={box.w}
                    height={box.h}
                    rx={isStage ? 14 : box.h / 2}
                    strokeWidth={1}
                    className={cn(
                      "transition-[fill,stroke] duration-300 group-focus-visible:stroke-ember",
                      isSelected
                        ? "fill-ember/15 stroke-ember"
                        : "fill-[#141418] stroke-white/20 group-hover:stroke-white/45",
                    )}
                  />
                  <text
                    x={box.x}
                    y={isStage ? box.y - 6 : box.y + 4}
                    textAnchor="middle"
                    className={cn("pointer-events-none text-[13px] font-medium", isSelected ? "fill-ember" : "fill-white/90")}
                  >
                    {n.label}
                  </text>
                  {isStage && (
                    <text
                      x={box.x}
                      y={box.y + 14}
                      textAnchor="middle"
                      className="pointer-events-none fill-white/45 font-mono text-[10.5px]"
                    >
                      {n.sub}
                    </text>
                  )}
                  {isStage && count !== undefined && (
                    <text
                      x={box.x + box.w / 2 - 10}
                      y={box.y - box.h / 2 - 7}
                      textAnchor="end"
                      className="pointer-events-none fill-white/40 font-mono text-[10px]"
                    >
                      {count.toLocaleString("en-US")} in
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border/60 px-4 py-3 font-mono text-[10px] text-muted-foreground">
          {LEGEND.map(([kind, label]) => (
            <li key={kind} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: PACKET_STYLE[kind].fill }} />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <aside className="flex flex-col gap-4">
        <div key={detail.id} className="animate-in rounded-2xl border border-border/60 bg-card/60 p-5 duration-300 fade-in">
          <p className="font-mono text-[10px] tracking-widest text-ember uppercase">
            {detail.kind === "station" ? "Station" : detail.kind === "sink" ? "Subscriber" : "Stage"}
          </p>
          <h2 className="mt-1.5 text-xl font-medium">{detail.label}</h2>
          <p className="font-mono text-xs text-muted-foreground">{detail.sub}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{detail.description}</p>
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border/60 pt-4">
            <div>
              <dt className="text-[10px] text-muted-foreground">Throughput</dt>
              <dd className="mt-0.5 font-mono text-xs">{detail.throughput}</dd>
            </div>
            <div>
              <dt className="text-[10px] text-muted-foreground">Latency</dt>
              <dd className="mt-0.5 font-mono text-xs">{detail.latencyS} s</dd>
            </div>
            <div>
              <dt className="text-[10px] text-muted-foreground">Processed</dt>
              <dd className="mt-0.5 font-mono text-xs tabular-nums">{(counts[detail.id] ?? 0).toLocaleString("en-US")}</dd>
            </div>
          </dl>
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {detail.tags.map((t) => (
              <li key={t}>
                <Badge variant="outline" className="rounded-full font-mono text-[10px] font-normal text-muted-foreground">
                  {t}
                </Badge>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Alert log</p>
          {log.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Inject a transient to follow it from a single dish to the community in about {END_TO_END_S} seconds.
            </p>
          ) : (
            <ol className="mt-3 space-y-2" aria-live="polite">
              {log.map((entry) => (
                <li
                  key={entry.id}
                  className="animate-in rounded-lg border border-rose-300/20 bg-rose-300/5 px-3 py-2 text-xs text-rose-100/90 duration-300 fade-in slide-in-from-top-1"
                >
                  {entry.text}
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}
