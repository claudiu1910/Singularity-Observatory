import { BellRing, Database, Scan, Users, Waves } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AlertTicker } from "@/components/landing/bento/alert-ticker";
import { InterferometryViz } from "@/components/landing/bento/interferometry-viz";
import { LensingCompare } from "@/components/landing/bento/lensing-compare";
import { Reveal } from "@/components/landing/reveal";
import { SpotlightCard } from "@/components/landing/spotlight-card";

const STATIONS = ["ALMA", "APEX", "JCMT", "SMA", "LMT", "IRAM 30m", "NOEMA", "SPT", "GLT", "KP 12m"];
const FORMATS = ["FITS", "Parquet", "Zarr", "HDF5", "ASDF", "VOTable"];
const TEAM = [
  { initials: "NA", color: "bg-amber-400/90" },
  { initials: "KT", color: "bg-sky-400/90" },
  { initials: "MR", color: "bg-rose-400/90" },
  { initials: "JL", color: "bg-emerald-400/90" },
];

function CardHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: typeof Scan;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-ember-soft text-ember ring-1 ring-ember/20 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:-rotate-6">
          <Icon className="size-[18px]" />
        </span>
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      {badge}
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-base text-foreground tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

const pill = "rounded-full border-white/10 bg-white/[0.03] font-mono text-[10px] font-normal text-muted-foreground";

/** Asymmetric bento grid of platform capabilities, each with a live mini-visual. */
export function PlatformBento() {
  return (
    <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* 1 — hero feature */}
      <Reveal className="md:col-span-2">
        <SpotlightCard tilt={false} className="flex h-full flex-col gap-5">
          <CardHeader
            icon={Scan}
            title="Event horizon imaging"
            badge={<Badge variant="outline" className={pill}>VLBI · 230 GHz</Badge>}
          />
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Every linked dish becomes one Earth-sized aperture. As the planet turns, each telescope pair sweeps a
            track through the uv-plane and fills in the synthesized image.
          </p>
          <InterferometryViz />
          <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-border/60 pt-4">
            <div className="flex gap-8">
              <Metric value="≈ 10,700 km" label="longest baseline" />
              <Metric value="≈ 20 µas" label="angular resolution" />
            </div>
            <ul className="flex max-w-md flex-wrap gap-1.5" aria-label="Participating stations">
              {STATIONS.map((s) => (
                <li key={s}>
                  <Badge variant="outline" className={pill}>
                    {s}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </SpotlightCard>
      </Reveal>

      {/* 2 — lensing inversion */}
      <Reveal delay={90}>
        <SpotlightCard tilt={false} className="flex h-full flex-col gap-5">
          <CardHeader icon={Waves} title="Lensing inversion" />
          <LensingCompare />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Drag across the frame: an observed Einstein ring on the left, the source galaxy our inversion
            recovers on the right.
          </p>
        </SpotlightCard>
      </Reveal>

      {/* 3 — alert stream */}
      <Reveal>
        <SpotlightCard tilt={false} className="flex h-full flex-col gap-5">
          <CardHeader
            icon={BellRing}
            title="Transient alerts"
            badge={
              <Badge variant="outline" className={cn(pill, "gap-1.5")}>
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-ember opacity-75 motion-reduce:hidden" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-ember" />
                </span>
                simulated feed
              </Badge>
            }
          />
          <AlertTicker />
          <p className="mt-auto text-sm text-muted-foreground">
            Gravitational waves, tidal disruptions and bursts, classified and pushed in under 90 s.
          </p>
        </SpotlightCard>
      </Reveal>

      {/* 4 — data lake */}
      <Reveal delay={90}>
        <SpotlightCard className="flex h-full flex-col gap-5">
          <CardHeader icon={Database} title="Open data lake" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every calibrated frame catalogued and queryable. Time-travel across epochs without moving a byte.
          </p>
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
            <Metric value="14.2 PB" label="catalogued" />
            <Metric value="3.1 B" label="sources" />
            <Metric value="42 ms" label="p50 query" />
          </div>
          <code className="block truncate rounded-lg bg-black/60 px-3 py-2 font-mono text-[11px] text-white/60">
            <span className="text-ember">SELECT</span> * <span className="text-ember">FROM</span> transients{" "}
            <span className="text-ember">WHERE</span> z &lt; 0.05
          </code>
          <ul className="mt-auto flex flex-wrap gap-1.5" aria-label="Supported formats">
            {FORMATS.map((f) => (
              <li key={f}>
                <Badge variant="outline" className={pill}>
                  {f}
                </Badge>
              </li>
            ))}
          </ul>
        </SpotlightCard>
      </Reveal>

      {/* 5 — workspaces */}
      <Reveal delay={180}>
        <SpotlightCard className="flex h-full flex-col gap-5">
          <CardHeader icon={Users} title="Workspaces" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Shared notebooks, versioned models and review trails for multi-institution teams.
          </p>
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-3">
            <div className="flex -space-x-2">
              {TEAM.map((m) => (
                <span
                  key={m.initials}
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-full text-[10px] font-semibold text-black ring-2 ring-card transition-transform duration-300 group-hover:translate-x-0.5",
                    m.color,
                  )}
                >
                  {m.initials}
                </span>
              ))}
              <span className="flex size-8 items-center justify-center rounded-full bg-muted font-mono text-[10px] text-muted-foreground ring-2 ring-card">
                +9
              </span>
            </div>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" /> 4 online
            </span>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            <span className="text-foreground/80">N. Adeyemi</span> pushed lens-model v14 · 2m ago
          </p>
          <div className="mt-auto grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
            <Metric value="212" label="research teams" />
            <Metric value="31" label="countries" />
          </div>
        </SpotlightCard>
      </Reveal>
    </div>
  );
}
