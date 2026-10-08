---
itemId: spec-waveform-render-engine
itemType: Software Item Spec
itemFulfills: KXITM5W9KCZ7B428B2A0A3N8QHTGGW7
---

# Waveform Render Engine - Latency Budget Enforcement

The render engine schedules acquired EMG, SSEP and MEP samples into display frames and enforces
an end-to-end display latency budget of 50 ms from acquisition to display. Samples that can no
longer be displayed inside the budget are dropped instead of being rendered late, so a stale
trace is never presented as live.

Implemented in `src/render/latencyBudget.ts` and `src/render/frameScheduler.ts`.
