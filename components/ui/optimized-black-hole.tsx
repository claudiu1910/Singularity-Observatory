"use client";

import { useEffect, useRef, useState } from "react";
import {
  createRenderer,
  type BlackHoleParams,
  type BlackHoleRenderer,
  type Framing,
} from "./optimized-black-hole-utils/renderer";

export type { BlackHoleParams, Framing };

interface BlackHoleProps {
  /** Physical/visual parameters; changes animate smoothly. */
  params?: Partial<BlackHoleParams>;
  /** Moves/zooms the hole within the canvas, e.g. to clear overlaid copy. */
  framing?: Framing;
  /** Slowly orbit the camera while idle (default true). */
  autoOrbit?: boolean;
  /** Drag to orbit the camera (default true). */
  interactive?: boolean;
}

/** Standalone host for the optimized black-hole renderer formerly used by the homepage. */
export function Example({ params, framing, autoOrbit = true, interactive = true }: BlackHoleProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BlackHoleRenderer | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Latest props for the mount effect, without re-creating the renderer on change.
  const initial = useRef({ params, framing, autoOrbit, interactive });

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createRenderer({ canvas, ...initial.current });
    rendererRef.current = renderer;
    void renderer.ready.then(() => {
      if (!cancelled) setIsReady(true);
    });
    return () => {
      cancelled = true;
      rendererRef.current = null;
      renderer.dispose();
    };
  }, []);

  const { spin, diskTemperature, inclination, dopplerBeaming, lensing } = params ?? {};
  useEffect(() => {
    rendererRef.current?.setParams(
      Object.fromEntries(
        Object.entries({ spin, diskTemperature, inclination, dopplerBeaming, lensing }).filter(
          ([, v]) => v !== undefined,
        ),
      ),
    );
  }, [spin, diskTemperature, inclination, dopplerBeaming, lensing]);

  const { offsetY, zoom, portraitLift } = framing ?? {};
  useEffect(() => {
    rendererRef.current?.setFraming({ offsetY: offsetY ?? 0, zoom: zoom ?? 1, portraitLift: portraitLift ?? true });
  }, [offsetY, zoom, portraitLift]);

  useEffect(() => {
    rendererRef.current?.setAutoOrbit(autoOrbit);
  }, [autoOrbit]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className={`block h-full w-full touch-none transition-opacity duration-500 ${
          isReady ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

export default Example;
