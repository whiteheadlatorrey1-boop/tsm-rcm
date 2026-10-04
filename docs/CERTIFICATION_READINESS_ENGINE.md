# Certification readiness engine (rebuilt foundation)

NEW CODE, rebuilt from scratch in a chat session. It is not the earlier reviewed patch.
Edit blueprints in `server/certification/blueprint-registry.js` to match real credentials.

Rules the gate enforces:
- Every score is returned with its sample size.
- Too few samples, a low score, or unreviewed evidence each block readiness.
- Evidence must be reviewed before it is used for staffing decisions.
- Build adapters only for blueprints with `revenueLinked: true`.

Run: `node scripts/test-phase-certification-gate.js`
