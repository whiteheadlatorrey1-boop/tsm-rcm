# Roadmap status

Snapshot: 2026-10-10. Source: `node scripts/roadmap-progress.js --run-tests`; full offline suite via `npm test` passed 59/59.

VERIFIED = the item's offline test files ran and passed. EXISTS = files found but not proven by the offline suite. NOT FOUND = not built.

**Summary: Verified 19 · Exists 2 · Not found 6**

## Verified
- MLO weighted blueprint (NMLS, official facts)
- Integration spine 15A–15G (readiness, Command Center, training, candidate registry, staffing, CRM, ATS/HRIS/WFM → Workforce Intelligence)
- Certification engine: blueprint registry + readiness gate, weighted exam-domain gate, question bank engine, timed simulation, work-note evidence
- Adapters: ServiceNow CSA, CompTIA A+
- Verticals: Microsoft 365 academy, HR Operations, L1 copilot (1 offline test passed; 43 other L1 test files are outside the offline suite)
- Operational evidence feeds readiness (L1 events)

## Exists, not proven
- MLO prep content (existing seed page): no tests found
- SAP content: 4 test files need env/credentials and are not in the offline suite

## Not built
- MLO original question bank (script's next suggested item)
- 15H end-to-end workforce journey test
- Certification route/event wiring
- Certification dashboard / Command Center view
- CRCR blueprint/bank (blocked on HFMA domain verification)
- CompTIA Network+ content

## Manual gates (not detectable by script)
- [ ] CRCR content domains verified against HFMA
- [ ] MLO audit report reviewed; add-on vs build decided
- [ ] L1 pilot client identified, scoped and priced
- [ ] Worker-consent / data-fairness review before production-evidence staffing
- [ ] NMLS pre-licensure education rules confirmed before MLO marketing
- [ ] Employment/IP agreement checked before using any employer ticket data
