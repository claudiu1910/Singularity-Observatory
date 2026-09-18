"use client";

import { useId, useState } from "react";

/** Logarithmic spiral arm as an SVG path, used for the reconstructed source galaxy. */
function spiralArm(offset: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const theta = offset + t * Math.PI * 2.1;
    const r = 6 + 56 * Math.exp(t * 1.1 - 1.1) * t;
    pts.push(`${(100 + Math.cos(theta) * r).toFixed(1)},${(100 + Math.sin(theta) * r * 0.62).toFixed(1)}`);
  }
  return `M${pts.join(" L")}`;
}

const STARS = [
  [18, 30, 0.6],
  [172, 22, 0.8],
  [160, 170, 0.5],
  [34, 158, 0.7],
  [120, 12, 0.4],
  [186, 110, 0.5],
  [10, 96, 0.4],
] as const;

/**
 * Before/after comparison: the observed Einstein ring (left of the handle)
 * versus the source-plane galaxy recovered by lens inversion (right).
 */
export function LensingCompare() {
  const [split, setSplit] = useState(50);
  const id = useId().replace(/:/g, "");

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-black select-none has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ember/60">
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
          <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <radialGradient id={`${id}-lens`}>
            <stop offset="0%" stopColor="#ffe3b0" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#f0a448" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f0a448" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-core`}>
            <stop offset="0%" stopColor="#e8f0ff" />
            <stop offset="100%" stopColor="#7fa8ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {STARS.map(([x, y, o]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.8" fill="white" opacity={o} />
        ))}

        {/* Source plane: reconstructed galaxy (full layer underneath). */}
        <g>
          <ellipse cx="100" cy="100" rx="70" ry="44" fill="#6f94ff" opacity="0.1" filter={`url(#${id}-soft)`} />
          {[0, Math.PI].map((o) => (
            <path
              key={o}
              d={spiralArm(o)}
              fill="none"
              stroke="#a9c3ff"
              strokeWidth="4.5"
              strokeLinecap="round"
              opacity="0.8"
              filter={`url(#${id}-blur)`}
            />
          ))}
          <ellipse cx="100" cy="100" rx="15" ry="10" fill={`url(#${id}-core)`} />
        </g>

        {/* Observed image: lens galaxy + Einstein ring, clipped to the left of the handle. */}
        <g style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
          <rect width="200" height="200" fill="black" />
          {STARS.map(([x, y, o]) => (
            <circle key={`o-${x}-${y}`} cx={x} cy={y} r="0.8" fill="white" opacity={o} />
          ))}
          <circle cx="100" cy="100" r="52" fill="none" stroke="#9ab8ff" strokeWidth="1" opacity="0.18" />
          {[
            [-60, 40],
            [35, 70],
            [128, 38],
            [190, 60],
          ].map(([start, sweep]) => {
            const a0 = (start * Math.PI) / 180;
            const a1 = ((start + sweep) * Math.PI) / 180;
            const r = 52;
            return (
              <path
                key={start}
                d={`M${100 + r * Math.cos(a0)},${100 + r * Math.sin(a0)} A${r},${r} 0 0 1 ${100 + r * Math.cos(a1)},${100 + r * Math.sin(a1)}`}
                fill="none"
                stroke="#c4d6ff"
                strokeWidth="5"
                strokeLinecap="round"
                filter={`url(#${id}-blur)`}
              />
            );
          })}
          <circle cx="100" cy="100" r="26" fill={`url(#${id}-lens)`} />
        </g>

        <line x1={split * 2} y1="0" x2={split * 2} y2="200" stroke="white" strokeOpacity="0.7" strokeWidth="0.6" />
      </svg>

      <div
        className="pointer-events-none absolute top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/60 text-[10px] text-white backdrop-blur-sm"
        style={{ left: `${split}%` }}
      >
        ⟷
      </div>

      <span className="pointer-events-none absolute top-2.5 left-2.5 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white/70">
        Observed
      </span>
      <span className="pointer-events-none absolute top-2.5 right-2.5 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10px] text-sky-200/80">
        Source plane
      </span>

      <input
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={(e) => setSplit(Number(e.target.value))}
        aria-label="Compare observed Einstein ring with reconstructed source galaxy"
        className="absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
