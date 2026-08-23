# A+ Training Engine — L1 Copilot module

Extends the L1 Ticket Copilot track with CompTIA A+ certification prep,
built as its own module rather than modifying `l1-ticket-copilot.html`.
Paired alongside the existing ServiceNow/ITIL prep tools
(`servicenow-fundamentals.html`, `servicenow-scenarios.html`,
`servicenow-exam-sim.html`) in the IT Support track of
`tsm-career-training-platform.html`.

## What's built (Phase 1 + first screen)

- `data/aplus-question-bank.js` — `APLUS_OBJECTIVES` (Core 1 / Core 2
  domain list) + `APLUS_QUESTION_BANK`. Each question's `choices` array
  is the **Answer Intelligence Layer**: every choice, right or wrong,
  carries `whatItDoes`, `whySomeoneMightChooseIt`, `whyCorrect`/`whyIncorrect`,
  and `whenItWouldBeCorrect` — plus a `concept` tag (e.g.
  `network-diagnostic-commands`) used for fine-grained mastery tracking,
  finer than the domain level.
- `js/aplus-engine.js` — `TSMAplusEngine`: question-session builder
  (shuffled, optionally filtered by domain), `evaluateAnswer()` (returns
  the full per-choice breakdown for the UI), and a mastery/remediation
  layer on `localStorage` (`tsm_aplus_mastery_v1`) tracking accuracy both
  by domain and by `concept` tag, with `getWeakConcepts()` surfacing
  weak spots once there's enough signal (3+ attempts, <60% accuracy).
- `aplus-practice.html` — "A+ Question Coach": the first real screen,
  proving the Answer Intelligence pattern end-to-end. Domain picker,
  progress bar, full 4-choice breakdown after every answer (not just
  "correct answer was B"), weak-concept banner, session summary with
  domain mastery.

Verified via jsdom (session build, answer evaluation, mastery/weak-concept
tracking, and a full click-through of the practice screen — 4 options
render, 4 answer-intelligence blocks render on answer, correct badge
present, next-question advances) plus `node --check`/syntax verification
on all new files.

## Original content, not reproduced exam material

Every scenario/question here is original, mapped to A+ domain areas —
not CompTIA's copyrighted questions. Re-check domain labels against the
current official exam objectives if CompTIA revises them; only
`APLUS_OBJECTIVES` should need updating, not the engine.

## Remaining phases (per the original build-order plan)

**Phase 2 — Learning**
- Learn Mode (conversational concept teaching, Core 1/Core 2, tied to
  the same objective list)
- Expand the question bank meaningfully beyond the 4 seed questions
  here (this pass proved the pattern on Networking/Hardware/OS; needs
  real breadth before this is exam-representative)
- Dedicated remediation mini-lessons triggered by `getWeakConcepts()`
  (engine hook exists; no lesson content or UI yet)

**Phase 3 — Technician simulation**
- Troubleshooting Lab (progressive-evidence tickets, à la the existing
  L1 ticket flow but gated: student chooses what to investigate next)
- PBQ / performance-based simulated tasks
- Tie into real L1 ticket scenarios for cross-over practice

**Phase 4 — Certification readiness**
- Timed assessment mode (same shape as `servicenow-exam-sim.html`,
  A+-scoped)
- A+ Readiness dashboard (Core 1 / Core 2 domain mastery rollup,
  overall readiness score — `getMasteryReport()` already returns the
  per-domain numbers this would render)

**Phase 5 — Career bridge**
- Interview Mode (technical + communication scoring on a
  troubleshooting walkthrough)
- A+ → Network+ → Security+ → Cloud pathway

None of Phase 2–5 is started. The engine (`TSMAplusEngine`) was built
so these can hook into it rather than each needing their own
data/scoring model — `evaluateAnswer`, `recordAttempt`, and
`getMasteryReport`/`getWeakConcepts` are the stable interface.
