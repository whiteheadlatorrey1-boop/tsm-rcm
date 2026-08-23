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
- ✅ Troubleshooting Lab (`aplus-lab.html`, data in
  `data/aplus-lab-scenarios.js`) — progressive-evidence tickets, not
  multiple choice. Student picks WHAT to check from a list of evidence
  sources, in any order, before diagnosing; each source reveals a
  finding plus a note on what it does/doesn't point toward. Checking
  an irrelevant source isn't penalized (real L1 work involves ruling
  things out) but is logged for an after-action "investigation
  efficiency" note. Every hypothesis — right or wrong — carries an
  explanation tied back to the evidence, same "don't waste a wrong
  answer" principle as the Question Coach's Answer Intelligence layer.
  Diagnosis calls `recordAttempt()` against the scenario's objective +
  the picked hypothesis's `concept` tag, so lab results feed the same
  shared mastery store as every other A+ tool. Linked from Question
  Coach, Learn Mode, Readiness Dashboard, Timed Assessment, L1 Ticket
  Copilot, and the career training platform's A+ app cards. Verified
  via jsdom: scenario picker, evidence check/uncheck toggling and
  reveal rendering, diagnose-stage lock, correct-diagnosis path
  (remediation card shown, mastery recorded 1/1), incorrect-diagnosis
  path (fail styling, no remediation card, mastery recorded 0/1), full
  per-hypothesis review rendering, investigation log, and retake flow.
  Seeded with 3 original scenarios (startup I/O bottleneck, DHCP lease
  failure, driver-conflict blue screen) across
  troubleshooting/networking/operating-systems.
- PBQ / performance-based simulated tasks — ✅ (`aplus-pbq.html`, data
  in `data/aplus-pbq-tasks.js`) — two task types, both scored
  all-or-nothing per attempt (matches how real A+ PBQs grade): `type:
  'sequence'` tasks where the student clicks shuffled procedure steps
  into the order they'd actually perform them (click a placed step to
  remove and redo it), and `type: 'match'` tasks where the student
  assigns shuffled items to categories via click-to-select chips.
  Review afterward shows every step's correct position (or every
  item's correct category) with a `why` explanation, right or wrong —
  same "explain every outcome" principle as the rest of the engine.
  Each task calls `recordAttempt()` once, keyed by the task's
  objective + `concept` tag, isCorrect true only if every
  step/item was placed correctly — proves the shared mastery
  interface works for procedural/sorting tasks, not just multiple
  choice or the Lab's evidence-based diagnosis. Linked from Question
  Coach, Learn Mode, Troubleshooting Lab, Timed Assessment, Readiness
  Dashboard, L1 Ticket Copilot, and the career training platform's A+
  app cards (now 8 tools on that panel). Seeded with 4 original tasks:
  2 sequencing (safe hard-drive replacement, malware remediation
  procedure) and 2 matching (connector/cable identification, security
  control categories) across hardware/security. Verified via jsdom:
  picker renders all 4 tasks, sequence placement/unplacement, submit
  gating until complete, correct-order pass path (score line, mastery
  1/1, no incorrect review rows), incorrect-order fail path (mastery
  correctly incremented to 1/2, incorrect rows flagged), match
  assignment via chip selection, correct-match pass path (score line,
  mastery recorded), and selected-chip styling.
- Tie into real L1 ticket scenarios for cross-over practice — not started

**Phase 4 — Certification readiness**
- ✅ A+ Readiness dashboard (`aplus-readiness.html`) — Core 1 / Core 2
  rollup across ALL 9 domains, including ones with zero attempts
  (`getReadinessReport()` on the engine reports the full domain set,
  not just ones with data, unlike `getMasteryReport()`). Shows an
  overall readiness ring, per-domain status
  (not-started/needs-work/developing/strong) with a progress bar, and
  a plain-language recommendation that prioritizes coverage gaps over
  accuracy gaps (an untouched domain drags the score down as much as
  a weak one). Linked from Learn Mode, Question Coach, L1 Ticket
  Copilot, and the career training platform's A+ app cards. Verified
  via jsdom across three states (empty, mixed, all-strong).
- ✅ Timed assessment mode (`aplus-assessment.html`) — same shape as
  `servicenow-exam-sim.html` (countdown timer, jump-to-any-question
  grid, locked answers until submit) but A+-scoped and drawing the
  FULL question bank rather than a fixed-size subset, at ~80
  sec/question. No feedback during the exam; the post-submit review
  reuses the Answer Intelligence panel from Question Coach on every
  question, right or wrong. Every question (answered or skipped)
  calls `recordAttempt()` on submit, so an assessment run updates the
  same shared mastery data the Readiness Dashboard reads from — not a
  separate score silo. Linked from Question Coach, Learn Mode,
  Readiness Dashboard, L1 Ticket Copilot, and the career training
  platform's A+ app cards. Verified via jsdom: full-bank question
  count, timer, qgrid nav, correct/incorrect/unanswered scoring,
  review panel rendering, mastery persisted to `localStorage`, and
  the readiness report reflecting results, plus reshuffled retake.

**Phase 5 — Career bridge**
- Interview Mode (technical + communication scoring on a
  troubleshooting walkthrough)
- A+ → Network+ → Security+ → Cloud pathway

Phase 4 is complete. Phase 3's Troubleshooting Lab and PBQ Simulation
are both done; only the real-ticket cross-over (tying A+ scenarios
into actual L1 Ticket Copilot tickets) is still open in Phase 3, along
with all of Phase 5. The engine (`TSMAplusEngine`) was built so these
can hook into it rather than each needing their own data/scoring
model — `evaluateAnswer`, `recordAttempt`,
`getMasteryReport`/`getWeakConcepts`, and `getReadinessReport` are the
stable interface; the Lab and PBQ Simulation both proved `recordAttempt`
generalizes cleanly beyond quiz questions — evidence-based diagnosis
and sequencing/matching tasks both feed the same mastery store without
any changes to the engine itself.
