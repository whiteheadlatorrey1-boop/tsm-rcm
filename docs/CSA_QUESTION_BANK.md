# CSA question bank and timed simulation

- Questions in `server/certification/question-banks/servicenow-csa-2026.json` are ORIGINAL practice questions written from the blueprint topics. They are not copied from ServiceNow or from exam-prep sites. Do not paste third-party exam questions into this file.
- Every question starts UNREVIEWED. A simulation that contains any unreviewed question is ignored by the readiness gate. A ServiceNow-knowledgeable person should check each answer, then run:
  `node scripts/csa-bank.js review <questionId> "Reviewer Name"`
- `node scripts/csa-bank.js status` shows coverage per domain and how many questions are reviewed.
- The bank has 120 questions (14, 16, 22, 22, 28, 18 per domain). One simulation draws 4, 6, 12, 12, 18, 8, so different runs use different questions. New questions are unreviewed until someone checks them.
- Multi-select questions are graded all-or-nothing. Unanswered questions count as wrong.
- A graded simulation returns `simRecord` (feed to the weighted gate as a simulation) and `domainEvidence` (one 0 or 100 row per question for the per-domain scores). The gate needs 10 samples per domain, so practice beyond a single simulation is still required.
- Nothing calls this code yet. There is no learner-facing screen.
