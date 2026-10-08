import { isWithinLatencyBudget, MAX_DISPLAY_LATENCY_MS } from "../src/render/latencyBudget";
import { scheduleFrame } from "../src/render/frameScheduler";

describe("display latency budget", () => {
  test("sample displayed exactly at the budget is within budget", () => {
    expect(isWithinLatencyBudget(1000, 1000 + MAX_DISPLAY_LATENCY_MS)).toBe(true);
  });

  test("sample displayed past the budget is out of budget", () => {
    expect(isWithinLatencyBudget(1000, 1000 + MAX_DISPLAY_LATENCY_MS + 1)).toBe(false);
  });

  test("frame scheduler drops samples that would render late", () => {
    const pending = [
      { channel: "SSEP-L", acquiredAtMs: 900, value: 1 },
      { channel: "SSEP-L", acquiredAtMs: 990, value: 2 },
    ];
    expect(scheduleFrame(pending, 1000).map((s) => s.value)).toEqual([2]);
  });
});
