/**
 * End-to-end display latency budget, measured from sample acquisition timestamp
 * to the frame that displays it. Derived from requirement D25-SOFTR-4.
 */
export const MAX_DISPLAY_LATENCY_MS = 50;

/**
 * Returns true when a sample acquired at `acquiredAtMs` and displayed at
 * `displayedAtMs` is within the display latency budget.
 */
export function isWithinLatencyBudget(acquiredAtMs: number, displayedAtMs: number): boolean {
  if (displayedAtMs < acquiredAtMs) {
    throw new Error("displayedAtMs precedes acquiredAtMs");
  }
  return displayedAtMs - acquiredAtMs <= MAX_DISPLAY_LATENCY_MS;
}
