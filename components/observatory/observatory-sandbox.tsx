"use client";

import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";
import { DEFAULT_TARGET, type BlackHoleTarget } from "@/lib/black-hole-targets";
import BlackHole, { type BlackHoleParams } from "@/components/ui/optimized-black-hole";
import { kerrHorizonRs, kerrIscoRs } from "@/components/ui/optimized-black-hole-utils/physics";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { TargetButtons } from "@/components/landing/target-hud";
import { useMediaQuery } from "@/hooks/use-media-query";

interface RangeControlProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

function RangeControl({ label, hint, value, min, max, step, format, onChange }: RangeControlProps) {
  const hintId = useId();
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-white/85">{label}</span>
        <span className="font-mono text-xs text-ember tabular-nums">{format(value)}</span>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        aria-describedby={hint ? hintId : undefined}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : (v as number))}
        className="[&_[data-slot=slider-range]]:bg-ember [&_[data-slot=slider-track]]:bg-white/10"
      />
      {hint && (
        <p id={hintId} className="font-mono text-[10px] text-white/40">
          {hint}
        </p>
      )}
    </div>
  );
}

function ToggleControl({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-sm text-white/85">{label}</span>
        <span className="block text-[11px] text-white/45">{description}</span>
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-checked:bg-ember dark:data-checked:bg-ember"
      />
    </label>
  );
}

/** The sandbox has no copy under the hole, so keep it centred on portrait screens. */
const SANDBOX_FRAMING = { portraitLift: false };

/** Full-screen renderer with a HUD drawer for the physical parameters. */
export function ObservatorySandbox() {
  const [params, setParams] = useState<BlackHoleParams>(DEFAULT_TARGET.view);
  const [preset, setPreset] = useState<BlackHoleTarget | null>(DEFAULT_TARGET);
  const [autoOrbit, setAutoOrbit] = useState(true);
  // Controls start open beside the view on desktop, collapsed over it on phones.
  const isDesktop = useMediaQuery("(min-width: 768px)", true);
  const [openChoice, setOpenChoice] = useState<boolean | null>(null);
  const open = openChoice ?? isDesktop;
  const panelId = useId();

  const update = (patch: Partial<BlackHoleParams>) => {
    setParams((p) => ({ ...p, ...patch }));
    setPreset(null);
  };
  const applyPreset = (t: BlackHoleTarget) => {
    setParams(t.view);
    setPreset(t);
  };

  const horizon = kerrHorizonRs(params.spin);
  const isco = kerrIscoRs(params.spin);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black">
      <div className="absolute inset-0">
        <BlackHole params={params} autoOrbit={autoOrbit} framing={SANDBOX_FRAMING} />
      </div>

      {/* Title + live readouts */}
      <div className="pointer-events-none absolute top-28 left-4 max-w-xs animate-in duration-700 fade-in sm:left-8 md:top-24">
        <p className="font-mono text-[11px] tracking-widest text-ember uppercase">Observatory sandbox</p>
        <h1 className="mt-2 font-display text-4xl text-white italic sm:text-5xl">
          {preset ? preset.name : "Custom singularity"}
        </h1>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[11px] text-white/55">
          <dt>Horizon r₊</dt>
          <dd className="text-white/85 tabular-nums">{horizon.toFixed(3)} rₛ</dd>
          <dt>ISCO</dt>
          <dd className="text-white/85 tabular-nums">{isco.toFixed(3)} rₛ</dd>
          <dt>Inclination</dt>
          <dd className="text-white/85 tabular-nums">{params.inclination.toFixed(0)}°</dd>
        </dl>
        <p className="mt-4 hidden font-mono text-[11px] text-white/35 md:block">Drag anywhere to orbit the camera.</p>
      </div>

      {/* Controls drawer: right-hand panel on desktop, bottom sheet on mobile. */}
      <section
        aria-label="Renderer controls"
        className={cn(
          "absolute inset-x-2 bottom-2 z-10 flex max-h-[48dvh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/55 text-white shadow-2xl backdrop-blur-xl",
          "md:inset-x-auto md:top-24 md:right-6 md:bottom-6 md:max-h-none md:w-80",
          "animate-in duration-700 fade-in slide-in-from-bottom-4 md:slide-in-from-right-4",
          !open && "md:bottom-auto",
        )}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpenChoice(!open)}
          className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-left outline-none focus-visible:bg-white/5"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="size-4 text-ember" /> Controls
          </span>
          <ChevronDown className={cn("size-4 text-white/50 transition-transform duration-300", !open && "-rotate-90")} />
        </button>

        <div id={panelId} hidden={!open} className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
          <div className="space-y-2.5">
            <p className="font-mono text-[10px] tracking-widest text-white/45 uppercase">Target preset</p>
            <TargetButtons active={preset} onTargetChange={applyPreset} size="md" />
          </div>

          <RangeControl
            label="Disk temperature"
            hint="Colour and brightness of the accretion flow"
            value={params.diskTemperature}
            min={0.5}
            max={1.6}
            step={0.01}
            format={(v) => `×${v.toFixed(2)}`}
            onChange={(diskTemperature) => update({ diskTemperature })}
          />
          <RangeControl
            label="Spin a*"
            hint="Pulls the inner disk and horizon inward; drags light around"
            value={params.spin}
            min={0}
            max={0.998}
            step={0.001}
            format={(v) => v.toFixed(3)}
            onChange={(spin) => update({ spin })}
          />
          <RangeControl
            label="Inclination"
            hint="0° face-on · 90° edge-on"
            value={params.inclination}
            min={5}
            max={89}
            step={1}
            format={(v) => `${v.toFixed(0)}°`}
            onChange={(inclination) => update({ inclination })}
          />
          <RangeControl
            label="Lensing strength"
            hint="1.00 = general relativity"
            value={params.lensing}
            min={0}
            max={1.5}
            step={0.01}
            format={(v) => v.toFixed(2)}
            onChange={(lensing) => update({ lensing })}
          />

          <div className="space-y-4 border-t border-white/10 pt-5">
            <ToggleControl
              label="Doppler beaming"
              description="Approaching side brightens and blue-shifts"
              checked={params.dopplerBeaming}
              onChange={(dopplerBeaming) => update({ dopplerBeaming })}
            />
            <ToggleControl
              label="Auto-orbit"
              description="Slowly circle the hole when idle"
              checked={autoOrbit}
              onChange={setAutoOrbit}
            />
          </div>

          <button
            type="button"
            onClick={() => applyPreset(DEFAULT_TARGET)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-sm text-white/70 transition-colors hover:border-ember/40 hover:text-white"
          >
            <RotateCcw className="size-3.5" /> Reset to {DEFAULT_TARGET.name}
          </button>
        </div>
      </section>
    </main>
  );
}
