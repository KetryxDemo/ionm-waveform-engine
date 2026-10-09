import { MAX_DISPLAY_LATENCY_MS } from "./latencyBudget";

/** Consecutive over-budget frames before the display-lag alarm is raised. */
export const LAG_ALARM_FRAMES = 3;

export interface FrameLatency {
  frameAtMs: number;
  /** Acquisition time of the oldest sample shown in the frame. */
  oldestSampleAtMs: number;
}

/**
 * Display-lag watchdog. Raises the DISPLAY_LAG alarm (visual banner + audible tone)
 * when LAG_ALARM_FRAMES consecutive frames exceed the display latency budget, so the
 * surgeon is warned that the waveform no longer reflects the patient's live neural state.
 */
export function shouldRaiseDisplayLagAlarm(frames: readonly FrameLatency[]): boolean {
  if (frames.length < LAG_ALARM_FRAMES) return false;
  return frames
    .slice(-LAG_ALARM_FRAMES)
    .every((f) => f.frameAtMs - f.oldestSampleAtMs > MAX_DISPLAY_LATENCY_MS);
}
