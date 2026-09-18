import type { BlackHoleParams } from "@/components/ui/optimized-black-hole";

export type TargetId = "sgr-a" | "m87" | "gargantua";

export interface BlackHoleTarget {
  id: TargetId;
  name: string;
  kind: string;
  /** Mass in solar masses. */
  massSolar: number;
  /** Dimensionless spin used for the model (see `spinNote`). */
  spin: number;
  spinNote: string;
  /** Shader parameters that give each target its look. */
  view: BlackHoleParams;
}

export const TARGETS: BlackHoleTarget[] = [
  {
    id: "sgr-a",
    name: "Sgr A*",
    kind: "Milky Way core",
    massSolar: 4.15e6,
    spin: 0.5,
    spinNote: "model value; measured spin is uncertain",
    // Dim, cooler flow seen from higher above the disk.
    view: { spin: 0.5, diskTemperature: 0.72, inclination: 62, dopplerBeaming: true, lensing: 1 },
  },
  {
    id: "m87",
    name: "M87*",
    kind: "Virgo A nucleus",
    massSolar: 6.5e9,
    spin: 0.9,
    spinNote: "model value; EHT-favoured range",
    view: { spin: 0.9, diskTemperature: 1, inclination: 80, dopplerBeaming: true, lensing: 1 },
  },
  {
    id: "gargantua",
    name: "Gargantua",
    kind: "Kerr · Interstellar",
    massSolar: 1.0e8,
    spin: 0.998,
    spinNote: "near-extremal Kerr",
    // Near edge-on with beaming off, like the film's render.
    view: { spin: 0.998, diskTemperature: 1.2, inclination: 86, dopplerBeaming: false, lensing: 1 },
  },
];

export const DEFAULT_TARGET = TARGETS[1];

const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

/** Formats a positive number as "4.15 × 10⁶". */
export function formatScientific(value: number, significant = 3) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  let exponent = Math.floor(Math.log10(value));
  let mantissa = Number((value / 10 ** exponent).toPrecision(significant));
  if (mantissa >= 10) {
    mantissa /= 10;
    exponent += 1;
  }
  const sup = String(exponent)
    .split("")
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join("");
  return `${mantissa.toFixed(significant - 1)} × 10${sup}`;
}
