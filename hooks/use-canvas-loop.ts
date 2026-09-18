"use client";

import { useEffect, useRef } from "react";

export interface CanvasFrame {
  ctx: CanvasRenderingContext2D;
  /** Size in CSS pixels (the context is pre-scaled for devicePixelRatio). */
  width: number;
  height: number;
  /** Seconds of animation time; frozen while paused. */
  time: number;
  /** Seconds since the previous frame (0 for static redraws). */
  dt: number;
}

interface Options {
  /** Run the loop; when false only static redraws (e.g. on resize) happen. */
  active?: boolean;
  /** Animation time used for the still frame shown with reduced motion. */
  staticTime?: number;
  maxPixelRatio?: number;
}

/**
 * Drives a 2D canvas animation: DPR-aware sizing, pausing while off-screen or
 * in a hidden tab, and a single still frame when the user prefers reduced motion.
 */
export function useCanvasLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  draw: (frame: CanvasFrame) => void,
  { active = true, staticTime = 4, maxPixelRatio = 2 }: Options = {},
) {
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let time = reduced ? staticTime : 0;
    let last = 0;
    let raf = 0;
    let visible = true;

    const render = (dt: number) => {
      if (!width || !height) return;
      drawRef.current({ ctx, width, height, time, dt });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(0);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      if (!visible || document.hidden) return;
      time += dt;
      render(dt);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      last = 0;
    });
    io.observe(canvas);

    if (active && !reduced) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [canvasRef, active, staticTime, maxPixelRatio]);
}
