"use client";

import { useRef } from "react";

import { useCanvasLoop } from "@/hooks/use-canvas-loop";

const EMBER = "240, 164, 72";
const SKY = "150, 190, 255";
const SWEEP_S = 9; // one synthetic "night" of Earth rotation
const HOLD_S = 1.6;
const DECLINATION = (42 * Math.PI) / 180;

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// Fixed pseudo-random baselines (station-pair separations, arbitrary units).
const BASELINES = (() => {
  const rand = seeded(20260918);
  return Array.from({ length: 12 }, () => {
    const len = 0.28 + rand() * 0.72;
    const theta = rand() * Math.PI * 2;
    return { bx: Math.cos(theta) * len, by: Math.sin(theta) * len, bz: (rand() - 0.5) * 0.6 };
  });
})();

const FRINGES = BASELINES.slice(0, 4);

function uvPoint(b: (typeof BASELINES)[number], hourAngle: number) {
  const u = b.bx * Math.cos(hourAngle) - b.by * Math.sin(hourAngle);
  const v =
    Math.sin(DECLINATION) * (b.bx * Math.sin(hourAngle) + b.by * Math.cos(hourAngle)) +
    Math.cos(DECLINATION) * b.bz * 0.35;
  return [u, v] as const;
}

/**
 * Earth-rotation aperture synthesis: each baseline sweeps an elliptical track
 * through the uv-plane (left) while its interference fringe and the
 * synthesized sum scroll by (right).
 */
export function InterferometryViz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useCanvasLoop(
    canvasRef,
    ({ ctx, width, height, time }) => {
      ctx.clearRect(0, 0, width, height);

      // ---- uv-plane -------------------------------------------------------
      const size = Math.min(height, width * 0.42);
      const cx = size / 2;
      const cy = height / 2;
      const scale = size * 0.46;
      const cycle = time % (SWEEP_S + HOLD_S);
      const progress = Math.min(cycle / SWEEP_S, 1);
      const fade = cycle > SWEEP_S ? 1 - (cycle - SWEEP_S) / HOLD_S : 1;
      const h0 = -Math.PI / 2;
      const hNow = h0 + progress * Math.PI;

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (const r of [0.33, 0.66, 1]) {
        ctx.beginPath();
        ctx.arc(cx, cy, scale * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - scale, cy);
      ctx.lineTo(cx + scale, cy);
      ctx.moveTo(cx, cy - scale);
      ctx.lineTo(cx, cy + scale);
      ctx.stroke();

      const steps = 48;
      for (const b of BASELINES) {
        for (const sign of [1, -1]) {
          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const h = h0 + (hNow - h0) * (i / steps);
            const [u, v] = uvPoint(b, h);
            const x = cx + sign * u * scale;
            const y = cy - sign * v * scale;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(${EMBER}, ${0.55 * fade})`;
          ctx.lineWidth = 1.4;
          ctx.stroke();

          const [u, v] = uvPoint(b, hNow);
          ctx.beginPath();
          ctx.arc(cx + sign * u * scale, cy - sign * v * scale, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 236, 200, ${0.95 * fade})`;
          ctx.fill();
        }
      }

      ctx.font = "10px var(--font-geist-mono), ui-monospace, monospace";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("u", cx + scale - 8, cy - 6);
      ctx.fillText("v", cx + 6, cy - scale + 10);

      // ---- fringes ----------------------------------------------------------
      const x0 = size + 24;
      const w = width - x0;
      if (w < 80) return;
      const mid = height / 2;
      const amp = height * 0.12;

      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.moveTo(x0, mid);
      ctx.lineTo(width, mid);
      ctx.stroke();

      const samples = Math.ceil(w / 3);
      const fringeAt = (b: (typeof FRINGES)[number], i: number, t: number) => {
        const [u, v] = uvPoint(b, hNow);
        const freq = 2 + Math.hypot(u, v) * 9;
        return Math.cos((t / samples) * freq * Math.PI * 2 - time * (1.2 + freq * 0.15));
      };

      FRINGES.forEach((b, k) => {
        ctx.beginPath();
        for (let i = 0; i <= samples; i++) {
          const y = mid - (k - 1.5) * amp * 0.9 + fringeAt(b, i, i) * amp * 0.28;
          const x = x0 + (i / samples) * w;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${SKY}, 0.28)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Synthesized sum, shown as the bright trace.
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        let sum = 0;
        FRINGES.forEach((b) => (sum += fringeAt(b, i, i)));
        const envelope = Math.exp(-Math.pow((i / samples - 0.5) * 3.2, 2));
        const y = mid + height * 0.3 - (sum / FRINGES.length) * amp * 1.3 * (0.35 + envelope);
        const x = x0 + (i / samples) * w;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${EMBER}, 0.95)`;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = `rgba(${EMBER}, 0.6)`;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("baseline fringes", x0, 12);
      ctx.fillStyle = `rgba(${EMBER}, 0.8)`;
      ctx.fillText("synthesized visibility", x0, height - 4);
    },
    { staticTime: SWEEP_S * 0.8 },
  );

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Animated aperture synthesis: telescope baselines trace elliptical tracks in the uv-plane while their interference fringes combine into a synthesized signal."
      className="h-56 w-full sm:h-60"
    />
  );
}
