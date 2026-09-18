import type { Metadata } from "next";
import { Clock, ShieldCheck, Sparkles } from "lucide-react";

import { AccessForm } from "@/components/access/access-form";
import { ParticleField } from "@/components/landing/particle-field";
import { Reveal } from "@/components/landing/reveal";
import { SiteFooter } from "@/components/landing/site-header";

export const metadata: Metadata = {
  title: "Request access",
  description: "Apply for Singularity early access as an academic institution, observatory facility or independent researcher.",
};

const PERKS = [
  { icon: Sparkles, title: "Full platform access", body: "Imaging, lensing inversion, alerts and the open data lake." },
  { icon: Clock, title: "Fast review", body: "Most requests are reviewed within two working days." },
  { icon: ShieldCheck, title: "Open science", body: "Your data products stay citable and reproducible." },
];

export default function AccessPage() {
  return (
    <main className="relative isolate flex flex-1 flex-col overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[900px] bg-radial-[ellipse_at_70%_20%] from-ember/18 via-ember/4 via-40% to-transparent to-70%"
      />
      <ParticleField className="absolute inset-x-0 top-0 -z-10 h-[900px] w-full opacity-70" />

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-4 pt-36 pb-24 sm:px-8 md:pt-40 lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:gap-16">
        <Reveal className="min-w-0 lg:pt-6">
          <p className="font-mono text-xs tracking-widest text-ember uppercase">Early access</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Cross the <span className="font-display font-normal text-ember italic">horizon</span>.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Tell us who you are and what you want to observe. We&apos;ll set you up with the right quota and an API key.
          </p>
          <ul className="mt-10 space-y-5">
            {PERKS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ember-soft text-ember ring-1 ring-ember/20">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120} className="min-w-0">
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-3xl bg-linear-to-b from-white/[0.06] to-transparent"
            />
            <div className="relative">
              <AccessForm />
            </div>
          </div>
        </Reveal>
      </div>

      <SiteFooter />
    </main>
  );
}
