/**
 * Minimal type declarations for the `solar-calculator` package which
 * ships pure JS. We only use the three functions needed by the
 * day/night terminator math.
 */
declare module "solar-calculator" {
  /** Julian century for the given date. */
  export function century(date: Date): number;
  /** Equation of time in minutes for the given century. */
  export function equationOfTime(century: number): number;
  /** Solar declination in degrees for the given century. */
  export function declination(century: number): number;
}
