# Phase 8A — Employer + Job Intelligence (Scope)

Status: scope only. No code in this phase.
Depends on: 7A Professional Readiness model, 7B Unified Evidence Layer, 7C Evidence -> Readiness projection (tag `phase-7c-complete`).

## 1. Purpose

Establish the employer/job side of the staffing equation so 8B (matching) compares like with like. 8A defines what a job requires, expressed in the same vocabulary the readiness model uses.

## 2. Governing principles (inherited from 7C)

- Pure, deterministic modules. Same input, same output.
- Candidate Registry remains the canonical evidence store. 8A never writes to it.
- No API mutation, no UI disruption. New modules are unwired until an explicit wiring phase.
- Nothing is inferred or fabricated. Unmapped requirements stay unmapped.
- Placement/employer data never flows back into training evidence (see 8F).

## 3. Entities

### Employer
- `employerId` (stable, opaque)
- `name`, `verticals[]` (references, not free text)
- `source` / provenance (how we learned of this employer)

### Job
- `jobId`, `employerId`
- `title`, `verticalId`, `roleId` (roleId maps to 7C role-specific readiness where one exists)
- `requirements[]`
- `status` (draft | open | closed), `provenance` (job order, posting, manual entry), `capturedAt`

### Requirement
- `requirementId`, `jobId`
- `competencyRef` — a reference into the competency taxonomy (Section 4), never inline free text
- `level` — required proficiency, normalized the same way 7C normalizes scores (accept 0-1 and 0-100, store one canonical form)
- `necessity` — required | preferred
- `evidenceKinds[]` (optional) — which kinds of evidence may satisfy it (e.g. certification, assessment, simulation)
- `rawText` — original wording kept for audit only; never used for matching

## 4. Competency reference model

- Requirements point at competency IDs in an extensible taxonomy. Phase 9 (Microsoft 365, HR Ops, CRM, ATS/HRIS/WFM) adds entries; it must not change the requirement schema.
- The taxonomy's top level aligns to the readiness dimensions defined in 7A. Any requirement whose text cannot be mapped to a known competency is recorded as `unmapped` and excluded from scoring, mirroring 7C's "no fabricated readiness from unmapped evidence."
- Taxonomy entries carry: `competencyId`, `label`, `dimensionId`, `verticalIds[]`, `aliases[]`, `version`.
- Taxonomy is versioned. Jobs record the taxonomy version they were normalized against.

## 5. Read-only boundaries

8A modules may:
- read the 7A model definitions and the competency taxonomy
- normalize job/employer input into the entities above

8A modules may not:
- read or write the Candidate Registry
- import the 7C projection (candidate side belongs to 8B/8D)
- perform any candidate matching, ranking, or scoring
- touch routes, storage, or UI

## 6. Compliance constraints (design now, retrofit never)

Automated matching/ranking in hiring is regulated in several jurisdictions (e.g. NYC Local Law 144 and newer state AI-in-employment rules). Confirm current requirements with counsel before 8B ships. Design constraints that begin in 8A:

- Requirement and job schemas contain no protected-class attributes and no proxies (no age, graduation-year filters, photo, name, address-derived fields).
- Requirements must be job-related and documented; `rawText` and provenance are retained for audit.
- 8B/8C must log match inputs and outputs and require human review before any submission (specified in their own scope docs).

## 7. Non-goals

- Candidate matching, ranking, or scoring (8B)
- Match explanations (8C)
- Unified candidate profile (see Section 9)
- Pipeline, submissions, placements (8E, 8F)
- Microsoft 365 / HR / CRM / ATS competency content (Phase 9)
- Scraping or ingesting external job boards
- Any UI, route, or storage changes

## 8. Proposed module layout (follows the 7C pattern)

- `html/js/career/tsm-employer-job-model.js` — entity constructors + validation
- `html/js/career/tsm-competency-taxonomy.js` — versioned taxonomy + lookup
- `html/js/career/tsm-job-requirement-normalizer.js` — raw job input -> normalized requirements
- `test/phase0.5/employer-job-*.test.js` — contract tests

Contract tests to write first:
1. modules load as pure (no I/O, no globals)
2. inputs are not mutated
3. requirements resolve to competency references; unknown text becomes `unmapped`
4. 0-1 and 0-100 levels normalize identically
5. provenance and `rawText` preserved, never invented
6. deterministic output for identical input; deterministic empty result for no requirements
7. no protected-class fields accepted in schema
8. taxonomy version recorded on every normalized job

## 9. Sequencing changes from the draft roadmap

- 8D (unified candidate profile) moves ahead of 8B: it is the read-only candidate input contract for matching. Call it 8B-0, or fold it into 8B.
- Phases 11 (Employer Intelligence), 12 (Match Engine), and 13 (Recruiter Ops) duplicate 8A, 8B, and 8E. Treat them as later hardening/scale phases of those, not new builds.
- Ground 8A in real job orders (JRLA staffing/placement, pilot employers) rather than synthetic data, and let that demand decide which Phase 10 verticals are built.

## 10. Exit criteria for 8A implementation

- All contract tests above pass
- Full regression stays green (26/26 baseline)
- Modules remain unwired (verified by grep, as in 7C closeout)
- `git diff --check` clean over the merge range
- Tag `phase-8a-complete`
