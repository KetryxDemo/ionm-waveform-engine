import { MAX_DISPLAY_LATENCY_MS } from "./latencyBudget";

export interface PendingSample {
  channel: string;
  acquiredAtMs: number;
  value: number;
}

/**
 * Selects which pending samples go into the next display frame. Samples that can no
 * longer be shown inside the latency budget are dropped rather than rendered late, so the
 * clinician never sees a stale trace presented as live.
 */
export function scheduleFrame(pending: PendingSample[], frameAtMs: number): PendingSample[] {
  return pending.filter((s) => frameAtMs - s.acquiredAtMs <= MAX_DISPLAY_LATENCY_MS);
}
