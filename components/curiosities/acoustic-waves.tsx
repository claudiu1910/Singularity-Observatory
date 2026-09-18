"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useCanvasLoop } from "@/hooks/use-canvas-loop";

/** B♭4. The Perseus tone is this B♭ shifted down 57 octaves (×2⁻⁵⁷). */
const AUDIBLE_HZ = 466.16;
const OCTAVES = 57;
const EMBER = "240, 164, 72";

interface AudioGraph {
  ctx: AudioContext;
  master: GainNode;
  analyser: AnalyserNode;
}

export function AcousticWaves() {
  const [playing, setPlaying] = useState(false);
  const graph = useRef<AudioGraph | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const samples = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const stop = () => {
    const g = graph.current;
    graph.current = null;
    setPlaying(false);
    if (!g) return;
    const now = g.ctx.currentTime;
    g.master.gain.cancelScheduledValues(now);
    g.master.gain.setTargetAtTime(0, now, 0.15);
    window.setTimeout(() => void g.ctx.close(), 600);
  };

  const start = () => {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    master.connect(analyser).connect(ctx.destination);

    // Warm pad: fundamental + octave below + soft fifth, gently detuned.
    const voices: Array<[number, number]> = [
      [AUDIBLE_HZ, 0.55],
      [AUDIBLE_HZ / 2, 0.35],
      [AUDIBLE_HZ * 1.5, 0.08],
    ];
    for (const [freq, level] of voices) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 6;
      const gain = ctx.createGain();
      gain.gain.value = level;
      osc.connect(gain).connect(master);
      osc.start();
    }

    // Slow swell, echoing the pressure ripples.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.25;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain).connect(master.gain);
    lfo.start();

    master.gain.setTargetAtTime(0.07, ctx.currentTime, 0.5);
    samples.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));
    graph.current = { ctx, master, analyser };
    setPlaying(true);
  };

  useEffect(
    () => () => {
      void graph.current?.ctx.close();
      graph.current = null;
    },
    [],
  );

  useCanvasLoop(
    canvasRef,
    ({ ctx, width, height, time }) => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.hypot(cx, cy);

      // Concentric pressure ripples, as in Chandra's Perseus image.
      for (let i = 0; i < 7; i++) {
        const r = ((time * 18 + i * (maxR / 7)) % maxR) + 4;
        const alpha = (1 - r / maxR) * (playing ? 0.45 : 0.18);
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.82, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${EMBER}, ${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
      core.addColorStop(0, "rgba(255, 230, 190, 0.9)");
      core.addColorStop(1, `rgba(${EMBER}, 0)`);
      ctx.fillStyle = core;
      ctx.fillRect(cx - 16, cy - 16, 32, 32);

      const g = graph.current;
      const buf = samples.current;
      ctx.beginPath();
      if (g && buf) {
        g.analyser.getByteTimeDomainData(buf);
        for (let i = 0; i < buf.length; i++) {
          const x = (i / (buf.length - 1)) * width;
          const y = cy + ((buf[i] - 128) / 128) * height * 1.6;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else {
        ctx.moveTo(0, cy);
        ctx.lineTo(width, cy);
      }
      ctx.strokeStyle = playing ? "rgba(255, 240, 220, 0.9)" : "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    },
    { active: true },
  );

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        In 2003 Chandra spotted ripples in the hot gas of the Perseus cluster, driven by its central black hole.
        They repeat roughly every 9.6 million years: a B♭ some 57 octaves below middle C.
      </p>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-black">
        <canvas ref={canvasRef} className="h-40 w-full" aria-hidden="true" />
        <div className="flex items-center gap-3 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={playing ? stop : start}
            aria-pressed={playing}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ember text-black transition-transform hover:scale-105 active:scale-95"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
            <span className="sr-only">{playing ? "Stop tone" : "Play tone"}</span>
          </button>
          <div className="font-mono text-[11px] leading-5">
            <p className="text-white/85">{playing ? "Playing · B♭4 ≈ 466 Hz" : "Play the Perseus tone"}</p>
            <p className="text-white/45">shifted up 2⁵⁷ ≈ 1.44 × 10¹⁷ times to be audible</p>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 font-mono text-[11px]">
        {[
          ["Source", "Perseus cluster (NGC 1275)"],
          ["Distance", "≈ 250 million ly"],
          ["Oscillation period", "≈ 9.6 Myr"],
          ["Real frequency", `≈ ${(AUDIBLE_HZ / 2 ** OCTAVES).toExponential(1)} Hz`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border/60 p-2.5">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
