import type { Metadata } from "next";

import { PipelineFlow } from "@/components/pipeline/pipeline-flow";
import { Reveal } from "@/components/landing/reveal";
import { SiteFooter } from "@/components/landing/site-header";

export const metadata: Metadata = {
  title: "Pipeline",
  description:
    "Follow data from raw VLBI packets through calibration and relativistic ray tracing to real-time alert dissemination.",
};

export default function PipelinePage() {
  return (
    <main className="flex flex-1 flex-col bg-background">
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-radial-[ellipse_at_top] from-ember/12 via-transparent via-60% to-transparent"
        />
        <div className="mx-auto w-full max-w-7xl px-4 pt-36 pb-10 sm:px-8 md:pt-40">
          <Reveal className="max-w-3xl">
            <p className="font-mono text-xs tracking-widest text-ember uppercase">Pipeline</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
              From raw packets to <span className="font-display font-normal text-ember italic">alerts in 84 seconds</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              Every stage of the Singularity dataflow, live. Click a node to inspect it, change the ingest rate, or
              inject a transient and follow it all the way to subscribers.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-8 sm:pb-32">
        <Reveal delay={120}>
          <PipelineFlow />
        </Reveal>
      </section>

      <SiteFooter />
    </main>
  );
}
