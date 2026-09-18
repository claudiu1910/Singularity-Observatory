/** Schwarzschild radius per solar mass, 2GM☉/c², in metres. */
export const RS_PER_SOLAR_MASS_M = 2953.25;

/** Schwarzschild radius in metres for a mass in solar masses. */
export function schwarzschildRadius(massSolar: number) {
  return RS_PER_SOLAR_MASS_M * massSolar;
}

/**
 * Prograde innermost stable circular orbit (Bardeen, Press & Teukolsky 1972),
 * in units of the Schwarzschild radius (3 rₛ at a* = 0, → 0.5 rₛ as a* → 1).
 */
export function kerrIscoRs(spin: number) {
  const a = Math.min(Math.max(spin, 0), 0.9999);
  const z1 = 1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a));
  const z2 = Math.sqrt(3 * a * a + z1 * z1);
  const iscoM = 3 + z2 - Math.sqrt((3 - z1) * (3 + z1 + 2 * z2));
  return iscoM / 2;
}

/** Outer event horizon r₊ = M(1 + √(1 − a²)), in units of rₛ = 2M. */
export function kerrHorizonRs(spin: number) {
  const a = Math.min(Math.max(spin, 0), 0.9999);
  return 0.5 * (1 + Math.sqrt(1 - a * a));
}

/**
 * Local-to-distant clock rate for a static observer at r (in rₛ) outside a
 * Schwarzschild hole: dτ/dt = √(1 − rₛ/r).
 */
export function timeDilationFactor(rOverRs: number) {
  return Math.sqrt(Math.max(1 - 1 / rOverRs, 0));
}
