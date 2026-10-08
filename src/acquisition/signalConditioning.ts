/**
 * Moving-average smoothing applied to raw evoked-potential samples before rendering.
 * Window length is fixed so the added processing delay is bounded and accounted for in
 * the display latency budget.
 */
export const SMOOTHING_WINDOW = 4;

export function smooth(samples: number[]): number[] {
  return samples.map((_, i) => {
    const start = Math.max(0, i - SMOOTHING_WINDOW + 1);
    const window = samples.slice(start, i + 1);
    return window.reduce((a, b) => a + b, 0) / window.length;
  });
}
