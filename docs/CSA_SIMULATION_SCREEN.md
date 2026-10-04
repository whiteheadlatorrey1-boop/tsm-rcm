# CSA simulation screen

1. `node scripts/csa-sim-page.js` writes `~/csa-sim/csa-sim.html`: one self-contained page with a 60-question, 90-minute simulation drawn by exam weight. Add `--seed N` to reproduce a run.
2. Serve it (`cd ~/csa-sim && python3 -m http.server 8080`) and open it in a browser. The page works offline once loaded.
3. Take the exam. The timer starts on Start, cannot pause, and submits itself at 0. Answers survive a reload in the same browser.
4. The result screen is provisional. It shows a record command. Paste it into the terminal from the repo root. `scripts/csa-record.js` rebuilds the simulation from the seed, regrades with the official grader and stores the run in `~/csa-results` (override with `CSA_RESULTS_DIR`).
5. `node scripts/csa-readiness.js` applies the weighted gate to every recorded run.

Rules worth knowing:
- Unreviewed questions make a run practice-only: the run does not count as a full simulation and its per-question results are not used as gate evidence.
- A seed can be recorded once. Generate a new page for a new run. Do not add or remove questions between generating a page and recording it, or the record is rejected.
- The timer and the minutes in the record are honor-system. This is self-study tooling, not a proctored exam.
- The page contains the answer key, so it is for practice only.
- Per-domain evidence needs 10 samples. Navigation (4 per run) and Instance Configuration (6 per run) need three runs to reach that.
