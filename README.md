# IONM Waveform Engine

Real-time processing and rendering pipeline for the Intraoperative Neuromonitoring (IONM) System.
Acquires raw EMG / SSEP / MEP samples from the amplifier, filters and averages them, and renders
waveforms to the clinician display within the end-to-end display latency budget.

Design controls for this repository are managed in Ketryx (project: IONM System). Requirements
live in Jama; specifications and tests in this repo are traced to them with Ketryx tags.

- `src/acquisition` - sample intake and signal conditioning
- `src/render` - frame scheduling and latency budget enforcement
- `specs` - software item specifications (Ketryx git-based items)
- `tests` - automated verification (Jest)
