# Certification blueprint sources

## ServiceNow CSA Mainline (`servicenow-csa-2026`)
- Official source: ServiceNow University, "Certified System Administrator (CSA) Mainline Exam Blueprint", KB0011554, updated January 2026.
- Looked up 2026-10-03. The official page loads with JavaScript, so the figures were read from search excerpts of that page, not the page itself. Spot-check KB0011554 before relying on them.
- Domains and weights: Platform Overview and Navigation 7, Instance Configuration 10, Configuring Applications for Collaboration 20, Self Service & Automation 20, Database Management and Platform Security 30, Data Migration and Integration 13 (total 100).
- Exam: 60 questions, 90 minutes.
- Pass score: not published. Some study sites say 70 percent, but that is not confirmed by ServiceNow. `exam.officialPassScore` is null on purpose.
- Older releases used different weights (for example 11, 27 and 15 percent). Many study sites still show them. Do not mix them in.
- `readiness.*` values (target 75, domain floor 60, 10 samples per domain, 2 full simulations) are this platform's own thresholds.
- Domain names match the official page. Under Data Migration and Integration the page lists UI Policies, Business Rules, update sets and scripting, which looks odd but is what it says.

The existing `servicenow-csa` entry in `blueprint-registry.js` is an earlier placeholder with invented skills. It is separate from this one and can be removed later.

## CRCR (HFMA) - facts only, not yet a blueprint
- Official source: HFMA, Certified Revenue Cycle Representative program pages (hfma.org).
- Looked up 2026-10-03.
- Exam: 75 multiple-choice questions, 90 minutes, 70 percent to pass, 30 days to wait before a retake.
- Domains and weights: NOT verified. The four content areas in our planning notes did not come from an HFMA document, and no official weights were found. Do not encode weights until HFMA's key concepts guide is checked.
- Not encoded as a weighted blueprint yet, because weighted-blueprints.js expects weights that sum to 100.
