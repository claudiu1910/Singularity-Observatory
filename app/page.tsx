import Link from "next/link";
import { ArrowRight, Orbit, Radar, Telescope } from "lucide-react";

import { cn } from "@/lib/utils";
import { HorizonCuriosities } from "@/components/curiosities/horizon-curiosities";
import { CountUp } from "@/components/landing/count-up";
import { AccessActions, HeroActions, HeroContent } from "@/components/landing/hero-content";
import { HeroStage } from "@/components/landing/hero-stage";
import { ParticleField } from "@/components/landing/particle-field";
import { PlatformBento } from "@/components/landing/platform-bento";
import { Reveal } from "@/components/landing/reveal";
import { LogoMark, SiteFooter } from "@/components/landing/site-header";
import { TelemetryConsole } from "@/components/landing/telemetry-console";

const STATS = [
  { value: 2.4, decimals: 1, suffix: " PB", label: "raw telemetry ingested nightly" },
  { value: 38, label: "radio & optical arrays federated" },
  { value: 90, prefix: "< ", suffix: " s", label: "median transient alert latency" },
  { value: 10000, suffix: " / hr", label: "lensing models resolved" },
];

const PIPELINE = [
  {
    step: "01",
    icon: Telescope,
    title: "Capture",
    body: "Raw visibilities and photometry stream in from federated arrays, time-stamped against hydrogen-maser clocks.",
  },
  {
    step: "02",
    icon: Radar,
    title: "Calibrate",
    body: "Atmospheric phase, instrument gain and RFI corrections are applied automatically and reproducibly.",
  },
  {
    step: "03",
    icon: Orbit,
    title: "Resolve",
    body: "General-relativistic ray tracing fits the observation, from photon ring to outer disk, in minutes.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-background text-foreground">
      {/* ---------------------------------------------------------------- Hero */}
      <HeroStage>
        <HeroContent>
          {/* Soft dark pool behind the copy keeps it legible over the bright disk. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-16 -top-20 -bottom-12 -z-10 bg-radial-[ellipse_at_30%_60%] from-black/80 via-black/40 via-45% to-transparent to-70%"
          />
          <div className="max-w-2xl">
            <p className="mb-6 hidden animate-in items-center gap-2 sm:inline-flex rounded-full border border-white/10 bg-black/40 px-3 py-1 font-mono text-[11px] tracking-widest text-white/70 uppercase backdrop-blur-md duration-700 fade-in slide-in-from-bottom-2">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-ember opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex size-1.5 rounded-full bg-ember" />
              </span>
              Deep Space Observatory<span className="hidden sm:inline"> · Event Horizon Analytics</span>
            </p>
            <h1 className="animate-in text-5xl leading-[0.95] font-semibold tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)] delay-150 duration-1000 fill-mode-both fade-in slide-in-from-bottom-4 sm:text-7xl lg:text-8xl">
              See past the
              <br />
              <span className="font-display font-normal text-ember italic">point of no return.</span>
            </h1>
            <p className="mt-6 max-w-lg animate-in text-base leading-relaxed text-white/70 delay-300 duration-1000 fill-mode-both fade-in slide-in-from-bottom-3 sm:text-lg">
              Singularity turns petabytes of raw deep-space telemetry into resolved images, lensing models and
              real-time alerts, right up to the edge of the event horizon.
            </p>
            <div className="animate-in delay-500 duration-1000 fill-mode-both fade-in slide-in-from-bottom-2">
              <HeroActions />
            </div>
          </div>
        </HeroContent>
      </HeroStage>

      {/* --------------------------------------------------------------- Stats */}
      <section id="stats" className="scroll-mt-16 border-y border-border/60">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "group px-4 py-10 transition-colors hover:bg-card/60 sm:px-8",
                i % 2 === 1 && "border-l border-border/60",
                i >= 2 && "border-t border-border/60 lg:border-t-0",
                i === 2 && "lg:border-l",
              )}
            >
              <dd className="text-3xl font-semibold tracking-tight transition-colors group-hover:text-ember sm:text-4xl">
                <CountUp value={s.value} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} />
              </dd>
              <dt className="mt-2 text-sm text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* -------------------------------------------------------- Platform */}
      <section id="platform" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-24 sm:px-8 sm:py-32">
        <Reveal className="max-w-2xl">
          <p className="font-mono text-xs tracking-widest text-ember uppercase">Platform</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            One instrument for the <span className="font-display font-normal italic">most extreme</span> objects in
            the universe.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            From the first photon captured to the final published model, every stage of the analysis lives in one
            reproducible workspace.
          </p>
        </Reveal>
        <PlatformBento />
      </section>

      {/* ------------------------------------------------------------ Pipeline */}
      <section id="pipeline" className="scroll-mt-16 border-t border-border/60 bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-16 px-4 py-24 sm:px-8 sm:py-32 lg:grid-cols-2 lg:items-center">
          <div className="min-w-0">
            <Reveal>
              <p className="font-mono text-xs tracking-widest text-ember uppercase">Pipeline</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                From photon to <span className="font-display font-normal italic">physics</span>.
              </h2>
            </Reveal>
            <ol className="relative mt-12 space-y-10">
              <span
                aria-hidden="true"
                className="absolute top-5 bottom-5 left-5 w-px bg-gradient-to-b from-ember/50 via-border to-transparent"
              />
              {PIPELINE.map(({ step, icon: Icon, title, body }, i) => (
                <Reveal as="li" key={step} delay={i * 120} className="group relative flex gap-5">
                  <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background transition-colors group-hover:border-ember/50">
                    <Icon className="size-4 text-ember" />
                  </span>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{step}</p>
                    <h3 className="text-lg font-medium">{title}</h3>
                    <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
            <Reveal delay={400}>
              <Link
                href="/pipeline"
                className="group mt-10 inline-flex items-center gap-2 text-sm font-medium text-ember hover:text-ember/80"
              >
                Open the interactive dataflow
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>

          <Reveal delay={150} className="min-w-0">
            <TelemetryConsole />
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------------- CTA */}
      <section id="access" className="relative isolate scroll-mt-16 overflow-hidden border-t border-border/60">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-radial-[ellipse_at_center] from-ember/20 via-ember/5 via-40% to-transparent to-70%"
        />
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -z-10 size-[520px] -translate-x-1/2 -translate-y-1/2 animate-[pulse_6s_ease-in-out_infinite] rounded-full bg-ember/10 blur-3xl motion-reduce:animate-none"
        />
        <ParticleField className="absolute inset-0 -z-10 size-full" />
        <Reveal className="relative mx-auto max-w-3xl px-4 py-32 text-center sm:px-8 sm:py-44">
          <LogoMark className="mx-auto size-10 animate-[spin_24s_linear_infinite] text-ember motion-reduce:animate-none" />
          <h2 className="mt-8 text-4xl font-semibold tracking-tight sm:text-6xl">
            Cross the <span className="font-display font-normal text-ember italic">horizon</span> with us.
          </h2>
          <p className="mx-auto mt-5 mb-10 max-w-xl text-lg text-muted-foreground">
            Early access is open to research institutions, observatories and independent researchers.
          </p>
          <AccessActions />
        </Reveal>
      </section>

      {/* Leave room for the floating Curiosities trigger. */}
      <SiteFooter className="pb-16" />
      <HorizonCuriosities />
    </main>
  );
}
