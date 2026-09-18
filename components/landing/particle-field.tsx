"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";
import { useCanvasLoop } from "@/hooks/use-canvas-loop";

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  alpha: number;
  warm: boolean;
}

const COUNT = 110;

function spawn(maxRadius: number, anywhere: boolean): Particle {
  return {
    angle: Math.random() * Math.PI * 2,
    radius: anywhere ? Math.sqrt(Math.random()) * maxRadius : maxRadius * (0.85 + Math.random() * 0.2),
    speed: 0.25 + Math.random() * 0.6,
    size: 0.4 + Math.random() * 1.5,
    alpha: 0.25 + Math.random() * 0.6,
    warm: Math.random() > 0.25,
  };
}

/** Amber motes slowly spiralling towards the centre, like a faint accretion flow. */
export function ParticleField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);

  useCanvasLoop(
    canvasRef,
    ({ ctx, width, height, dt }) => {
      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.hypot(cx, cy);
      if (particles.current.length === 0) {
        particles.current = Array.from({ length: COUNT }, () => spawn(maxRadius, true));
      }

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles.current) {
        // Keplerian-ish: faster and more inward drift closer in.
        const omega = (p.speed * 0.9) / Math.max(p.radius / 120, 0.4);
        p.angle += omega * dt * 0.12;
        p.radius -= dt * (6 + 900 / Math.max(p.radius, 30)) * p.speed;
        if (p.radius < 26) Object.assign(p, spawn(maxRadius, false));

        const x = cx + Math.cos(p.angle) * p.radius;
        const y = cy + Math.sin(p.angle) * p.radius * 0.55;
        // Fade out near the centre and at the edges.
        const fade = Math.min(1, (p.radius - 26) / 80) * Math.min(1, (maxRadius - p.radius) / 120 + 0.2);
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.warm
          ? `rgba(240, 164, 72, ${p.alpha * fade})`
          : `rgba(255, 240, 220, ${p.alpha * fade * 0.8})`;
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    },
    { staticTime: 0 },
  );

  return <canvas ref={canvasRef} aria-hidden="true" className={cn("pointer-events-none", className)} />;
}
