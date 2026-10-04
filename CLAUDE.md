# Project notes for Claude Code
- Certification engine lives in `server/certification/`. Read `docs/CERTIFICATION_READINESS_ENGINE.md` first.
- Run `node scripts/test-phase-certification-gate.js` after any change there; it must report 0 failed.
- Never use worker evidence for staffing unless it is marked reviewed.
- Always show sample size beside any score.
