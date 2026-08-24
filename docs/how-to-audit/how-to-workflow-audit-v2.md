# TSM How-To Workflow Audit V2

This version focuses on **real interaction and workflow signals**, rather than merely finding words such as `report` or `workflow`.

## Executive Summary

- HTML pages scanned: **429**
- P0 candidates: **336**
- P1 candidates: **29**
- Pages with real UI actions: **402**
- Pages with actual report/export code signals: **268**
- Pages already containing obvious How-To language: **88**

## The TSM How-To Standard


Every important application should eventually communicate this sequence:

**PROBLEM → START → INPUT → ANALYZE → REVIEW → DECIDE → EXECUTE → REPORT → MEASURE**

A user should never have to wonder what to do next.

## P0 — Start Here

### html/TSM_Shell_Honeywell_TalkTrack_30min.html
**Score:** 100  **Title:** TSM Shell · Honeywell Pitch · 30-Min Talk Track
**Vertical:** healthcare, construction, bpo, real estate, insurance, legal, finops, supplier, vendor, approval
**Signals:** actions=1, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/access.html
**Score:** 100  **Title:** TSM Matter · Client Portal
**Vertical:** healthcare, construction, bpo, mortgage, real estate, insurance, legal, hotel, hotelops, tax
**Signals:** actions=6, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE

### html/agents-ins.html
**Score:** 100  **Title:** TSM Insurance Intelligence — AI for Insurance Professionals
**Vertical:** insurance, supplier, crm, approval
**Signals:** actions=8, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** The AI your agents wish they had on every call | Close more. Know more. Work faster. | Make every agent on your team a top producer. | Compliant agents. Lower E&O exposure. Better distribution. | Train agents faster. Test knowledge. Build better producers. | Demo Requested

### html/agents-ins/index.html
**Score:** 100  **Title:** TSM Insurance Intelligence — AI for Insurance Professionals
**Vertical:** insurance, supplier, crm, approval
**Signals:** actions=7, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** The AI your agents wish they had on every call | Close more. Know more. Work faster. | Make every agent on your team a top producer. | Compliant agents. Lower E&O exposure. Better distribution. | Train agents faster. Test knowledge. Build better producers. | Demo Requested

### html/appointments/index.html
**Score:** 100  **Title:** TSM Healthcare Command Center · BNCA Full System
**Vertical:** healthcare, insurance, tax, vendor
**Signals:** actions=5, report-actions=2
**Likely guidance gaps:** HOW-TO

### html/auditops-pro.html
**Score:** 100  **Title:** AuditOps Pro · TSM AI Tax Intelligence Platform
**Vertical:** construction, mortgage, real estate, legal, tax, itops
**Signals:** actions=7, report-actions=5

### html/az-ins.tsmatter.html
**Score:** 100  **Title:** AZ Insurance Command
**Vertical:** insurance, finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/az-ins/index.html
**Score:** 100  **Title:** AZ Insurance Command · NPN 18818059
**Vertical:** healthcare, mortgage, insurance, tax
**Signals:** actions=8, report-actions=4
**Headings:** ${key}

### html/az-life/index.html
**Score:** 100  **Title:** AZ Insurance Command · NPN 18818059
**Vertical:** healthcare, construction, mortgage, insurance, legal, tax, itops, vendor, approval
**Signals:** actions=8, report-actions=8
**Headings:** ◌ AI Executive Summary | 📋 Saved Analysis Items (${reportItems.length}) | 👥 Client Roster (${clients.length})

### html/banner-health-demo.html
**Score:** 100  **Title:** Banner Health — Operational Intelligence + FinOps Pro Demo
**Vertical:** healthcare, insurance, legal, finops, finance, vendor
**Signals:** actions=2, report-actions=2
**Likely guidance gaps:** HOW-TO
**Headings:** Banner Health

### html/bnca-gtm-hc.html
**Score:** 100  **Title:** BNCA Healthcare GTM Study Page · TSM Command Mode
**Vertical:** healthcare, insurance, tax, vendor
**Signals:** actions=2, report-actions=1
**Headings:** We tell your office what to do next. | Homepage + conversion copy | Demo script for closing deals | Lead magnet funnel for cold traffic | Presentation notes for Thursday

### html/bpo-files/tsm-staffing-intelligence.html
**Score:** 100  **Title:** TSM · Staffing Intelligence Platform
**Vertical:** healthcare, construction, bpo, insurance, legal, finops, finance, tax, crm
**Signals:** actions=4, report-actions=2
**Likely guidance gaps:** HOW-TO
**Headings:** Validate Candidates Before They Cost You a Client. | Traditional Staffing Is Flying Blind. | Resume-Only Screening | Workforce Intelligence Scoring | Every Role. Every Industry. Pre-Validated. | From Upload to Placement Decision in 30 Minutes. | Role Selection | Live Workflow Scenario

### html/bpo-legal.tsmatter.html
**Score:** 100  **Title:** BPO Legal Command
**Vertical:** bpo, legal, finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/bpo-realty.tsmatter.html
**Score:** 100  **Title:** BPO Realty Command
**Vertical:** bpo, finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/bpo-tax.tsmatter.html
**Score:** 100  **Title:** BPO Tax Command
**Vertical:** bpo, finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/case-tech.tsmatter.html
**Score:** 100  **Title:** Case-Tech Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/client-access.html
**Score:** 100  **Title:** TSM Client Access — Sovereign Intelligence Portal
**Vertical:** healthcare, construction, bpo, real estate
**Signals:** actions=5, report-actions=2
**Likely guidance gaps:** HOW-TO
**Headings:** Enterprise BPO Service Performance Portal | What TSM Runs For You | Client Deliverables | WIP Figures The Client Should See | SLA Plan | Pricing Justification

### html/compliance.html
**Score:** 100  **Title:** TSM Compliance Command | AI-Powered Regulatory Intelligence
**Vertical:** insurance, legal, finops, finance, tax
**Signals:** actions=7, report-actions=6
**Headings:** TSM COMPLIANCE COMMAND

### html/compliance/index.html
**Score:** 100  **Title:** TSM Compliance Command | AI-Powered Regulatory Intelligence
**Vertical:** vendor
**Signals:** actions=5, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/construction-center.html
**Score:** 100  **Title:** TSM | Construction Command
**Vertical:** construction, insurance, legal, finance, tax
**Signals:** actions=6, report-actions=2
**Headings:** " + data.report_title + "

### html/construction-command.tsmatter.html
**Score:** 100  **Title:** TSM | Construction Command
**Vertical:** construction, finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/construction-demo-presentation.html
**Score:** 100  **Title:** TSM &middot; Construction &middot; Demo Presentation
**Vertical:** healthcare, construction
**Signals:** actions=2, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** One project. Three-stage relay. Four field-ops modules. | The full Construction command surface | The two moments to lead with: Permits &amp; Proposals, FieldOps Daily | How a project becomes an executive-ready brief | What's live today &mdash; and what's still roadmap | See the relay chain live

### html/construction-suite/auditops-tax.html
**Score:** 100  **Title:** AuditOps Pro · TSM AI Tax Intelligence Platform
**Vertical:** construction, mortgage, real estate, legal, tax, itops
**Signals:** actions=7, report-actions=5

### html/construction-suite/compliance-hub.html
**Score:** 100  **Title:** TSM Compliance Command | AI-Powered Regulatory Intelligence
**Vertical:** construction, tax
**Signals:** actions=6, report-actions=3
**Likely guidance gaps:** HOW-TO
**Headings:** TSM COMPLIANCE COMMAND

### html/construction-suite/compliance.html
**Score:** 100  **Title:** TSM Compliance Command | AI-Powered Regulatory Intelligence
**Vertical:** construction, tax
**Signals:** actions=6, report-actions=3
**Likely guidance gaps:** HOW-TO
**Headings:** TSM COMPLIANCE COMMAND

### html/construction-suite/construct-pitch.html
**Score:** 100  **Title:** TSM · Construction Suite
**Vertical:** construction, insurance, legal, tax, itops, approval
**Signals:** actions=1, report-actions=2
**Likely guidance gaps:** HOW-TO
**Headings:** Your jobs are bleeding money you can't see. | Construction Hub | Field & Document Ops | AuditOps Pro | Construction Strategist

### html/construction-suite/construction-command-pro.html
**Score:** 100  **Title:** TSM | CONSTRUCTION COMMAND
**Vertical:** construction, insurance, legal, finance, tax, itops, property, vendor
**Signals:** actions=7, report-actions=2
**Headings:** START HERE · CONSTRUCTION OPERATOR WORKFLOW | " + data.report_title + " | WHAT YOU CAN DO HERE

### html/construction-suite/construction-command.html
**Score:** 100  **Title:** TSM | CONSTRUCTION COMMAND
**Vertical:** construction, insurance, legal, finance, tax, itops, property, vendor
**Signals:** actions=7, report-actions=2
**Headings:** START HERE · CONSTRUCTION OPERATOR WORKFLOW | " + data.report_title + " | WHAT YOU CAN DO HERE

### html/construction-suite/construction-hub.html
**Score:** 100  **Title:** TSM Construction Intelligence Suite · Command Hub
**Vertical:** construction, insurance, legal, logistics, finance, tax, itops, property
**Signals:** actions=7, report-actions=2
**Likely guidance gaps:** HOW-TO
**Headings:** STOP LOSING MONEY ON EVERY JOB SITE. | Construction Intelligence Suite | Construction WIP + Billing | Construction WIP + Billing

### html/construction-suite/construction-pro.html
**Score:** 100  **Title:** AuditOps // Sovereign Core · TSM
**Vertical:** construction, legal, logistics, finance, itops, vendor
**Signals:** actions=5, report-actions=5

### html/construction-suite/construction-scenarios.html
**Score:** 100  **Title:** Construction Operational Scenarios · TSM Academy
**Vertical:** construction, insurance, legal, tax, itops, approval
**Signals:** actions=4, report-actions=3
**Likely guidance gaps:** HOW-TO
**Headings:** Construction Scenario Engine | 📁 REAL PROJECT DOCUMENTS — LOAD INTO ANY SCENARIO | Permit Block — Foundation CO-7 Disputed · $340K at Risk | MISSION OBJECTIVES — COMPLETE IN ORDER | Incident Report Apr-14 — OSHA Citation Risk · $180K Exposure | MISSION OBJECTIVES | Q1 Invoice Backlog + Roofing Sub Bid — $520K AR Pressure | MISSION OBJECTIVES

### html/construction-suite/construction-showcase-v2.html
**Score:** 100  **Title:** TSM · FinOps Doc Showcase · 4-Engine BNCA
**Vertical:** construction, logistics, finops, tax, vendor, approval
**Signals:** actions=6, report-actions=6
**Likely guidance gaps:** HOW-TO

### html/construction-suite/construction-suite-expansion.html
**Score:** 100  **Title:** TSM Construction Suite — Field & Document Ops
**Vertical:** construction, finops, supplier, approval
**Signals:** actions=8, report-actions=5
**Headings:** GEOSPATIAL SITE LOCK

### html/construction-suite/construction-wip.html
**Score:** 100  **Title:** TSM · Construction WIP + Billing Intelligence
**Vertical:** construction, itops, supplier, vendor, approval
**Signals:** actions=5, report-actions=3
**Likely guidance gaps:** HOW-TO
**Headings:** Construction WIP + Billing Intelligence Dashboard

### html/construction-suite/contruction-pro.html
**Score:** 100  **Title:** AuditOps // Sovereign Core · TSM
**Vertical:** construction, legal, logistics, finance, itops, vendor
**Signals:** actions=5, report-actions=5

### html/construction-suite/doc-showcase2.html
**Score:** 100  **Title:** Document Hub — Construction Suite
**Vertical:** construction, vendor
**Signals:** actions=4, report-actions=2
**Likely guidance gaps:** HOW-TO
**Headings:** Project Documents

### html/construction-suite/document-showcase.html
**Score:** 100  **Title:** Construction BNCA · Neural Bridge · TSM
**Vertical:** construction, legal, finance, itops
**Signals:** actions=8, report-actions=7
**Likely guidance gaps:** HOW-TO

### html/construction-suite/financial.html
**Score:** 100  **Title:** TSM Financial Intelligence Pro
**Vertical:** healthcare, construction, mortgage, insurance, legal, schools, finance, tax
**Signals:** actions=6, report-actions=1

### html/construction-suite/financial/index.html
**Score:** 100  **Title:** TSM | Financial Command
**Vertical:** construction, finance, tax, approval
**Signals:** actions=7, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/construction-suite/how-to.html
**Score:** 100  **Title:** Construction Suite · How To Guide · TSM
**Vertical:** construction, insurance, legal, logistics, finance, itops, vendor
**Signals:** actions=2, report-actions=4
**Headings:** How To Run AuditOps Pro | Suite Overview | Daily Workflows | The 4-Node Pipeline | All 11 Modules | Step-by-Step Walkthrough

### html/construction-suite/index.html
**Score:** 100  **Title:** TSM Construction Intelligence Suite · Command Hub
**Vertical:** construction, insurance, legal, logistics, finance, tax, itops
**Signals:** actions=7, report-actions=2
**Likely guidance gaps:** HOW-TO
**Headings:** STOP LOSING MONEY ON EVERY JOB SITE. | Construction Intelligence Suite

### html/construction-suite/legal.html
**Score:** 100  **Title:** Legal Analyst Pro · TSM Consultz
**Vertical:** healthcare, construction, real estate, legal, property, vendor
**Signals:** actions=8, report-actions=4
**Likely guidance gaps:** HOW-TO

### html/construction-suite/permits-proposals.html
**Score:** 100  **Title:** Permits & Proposals · TSM Construction Suite
**Vertical:** construction, legal, tax, itops, approval
**Signals:** actions=6, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** Permits & Proposals

### html/construction-suite/property-accounting-revenue-cycle.html
**Score:** 100  **Title:** TSM · Construction · Property Accounting & Revenue Cycle
**Vertical:** construction, mortgage, insurance, tax, property, vendor, approval
**Signals:** actions=6, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** Property Accounting &amp; Revenue Cycle | Update Property Budget | Accounting Exception Queue | AP Invoice Approval Queue | General Ledger — Post Journal Entry | Month-End Close Workflow

### html/construction-suite/tsm-construction-command.html
**Score:** 100  **Title:** TSM Construction Command Suite — Autonomous Project Intelligence
**Vertical:** construction, insurance, legal, logistics, finops, vendor, approval
**Signals:** actions=6, report-actions=3
**Likely guidance gaps:** HOW-TO
**Headings:** The Construction Command Suite | Six Nodes. One Project Brain. | The Field-Office Gap — Why Manual Project Controls Fail Commercial GCs | One Number. Six Dimensions. | What Your Project Team Actually Gets. | Construction Command Node — Project Intelligence | Step-by-Step: Run the Suite | Ask the Suite. Neural-Powered.

### html/construction-suite/tsm-construction-pitch.html
**Score:** 100  **Title:** TSM Construction Command — Executive Intelligence Suite
**Vertical:** construction, legal, finops, finance, approval
**Signals:** actions=7, report-actions=2
**Likely guidance gaps:** HOW-TO
**Headings:** Construction finance is where project risk becomes executive exposure. | Know What's Wrong Before the Project Shows It. | Every GC Is Running Blind Between the Field and the Office. | One Command Layer Across Every Project Function. | This Is What TSM Delivers Every Morning. | Every Function. Every Node. One Platform. | The Numbers Close Themselves. | Stop Reading Reports. Start Commanding.

### html/construction-suite/zero-trust.html
**Score:** 100  **Title:** TSM Zero-Trust | Enterprise Access Command
**Vertical:** construction, mortgage, legal, hotel, hotelops, finops, finance, tax, itops, vendor
**Signals:** actions=6, report-actions=3

### html/construction-wip.html
**Score:** 100  **Title:** TSM · Construction WIP + Billing Intelligence
**Vertical:** construction, itops, approval
**Signals:** actions=5, report-actions=2
**Likely guidance gaps:** HOW-TO
**Headings:** Construction WIP + Billing Intelligence Dashboard

### html/cyber-incident.html
**Score:** 100  **Title:** TSM · Cyber/OT Incident Command Center
**Vertical:** supplier
**Signals:** actions=5, report-actions=2
**Likely guidance gaps:** HOW-TO, EXECUTION

### html/demo/presentation-hub.html
**Score:** 100  **Title:** TSM Deck Archive
**Vertical:** healthcare, construction, bpo, mortgage, real estate, insurance, legal, hotel, hotelops, logistics, finops, property, supplier, vendor, approval
**Signals:** actions=3, report-actions=1
**Likely guidance gaps:** HOW-TO, START
**Headings:** Presentation War Room | Denial &amp; Appeal War Room | Claim File to Carrier-Ready Decision | Legal Matter Intelligence Command | Mortgage Origination Command | Purchase Agreement to Closing-Ready Decision | The Executive Portal That Makes Your AI Ops Provable | BPO Services

### html/demo/presentations/career-demo-presentation.html
**Score:** 100  **Title:** TSM &middot; Career Training Platform &middot; Demo Presentation
**Vertical:** healthcare, approval
**Signals:** actions=3, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** Career Training Platform &middot; Decision Intelligence Academy | Core candidate-lifecycle panels + the sector training suites underneath | Assign &rarr; train &rarr; prove readiness &rarr; approve &rarr; deploy | Click through the acts &mdash; talk points included | What's live today | Run it live

### html/desert-financial.tsmatter.html
**Score:** 100  **Title:** Desert Financial Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/dignity-exec-presentation.html
**Score:** 100  **Title:** TSM Intelligence · Dignity Health Executive Brief
**Vertical:** healthcare, legal, finops, supplier
**Signals:** actions=4, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE

### html/financial-command.html
**Score:** 100  **Title:** TSM | Financial Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/financial-command.tsmatter.html
**Score:** 100  **Title:** TSM | Financial Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/financial.html
**Score:** 100  **Title:** TSM Financial Intelligence Pro
**Vertical:** healthcare, construction, mortgage, insurance, legal, schools, finance, tax
**Signals:** actions=6, report-actions=1

### html/finops-accounting.html
**Score:** 100  **Title:** TSM FinOps · Financial Accounting Command
**Vertical:** finops
**Signals:** actions=8, report-actions=5
**Likely guidance gaps:** HOW-TO, EXECUTION

### html/finops-command-suite-v2.html
**Score:** 100  **Title:** TSM FinOps Command Suite — Autonomous Financial Intelligence
**Vertical:** construction, mortgage, legal, hotel, hotelops, finops, tax, itops, vendor, approval
**Signals:** actions=7, report-actions=2
**Headings:** The FinOps Command Suite | Six Nodes. One Financial Brain. | The Human Bottleneck — Why Manual Accounting Fails Growing Businesses | FinOps Copilot — Command Intelligence | Step-by-Step: Run the Suite | Ask the Suite. Groq-Powered. | Live Intel. Real Numbers.

### html/finops-main-strategist.html
**Score:** 100  **Title:** TSM · FinOps Main Strategist · Controller Action Plan
**Vertical:** finops, finance, tax, vendor, approval
**Signals:** actions=7, report-actions=6

### html/finops-main-strategist1.html
**Score:** 100  **Title:** FinOps Main Strategist · TSM
**Vertical:** finops, tax, vendor, approval
**Signals:** actions=5, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/finops-suite/compliance.html
**Score:** 100  **Title:** TSM Compliance Command | AI-Powered Regulatory Intelligence
**Vertical:** insurance, legal, finops, finance, tax
**Signals:** actions=7, report-actions=6
**Headings:** TSM COMPLIANCE COMMAND

### html/finops-suite/doc-analysis-tab.html
**Score:** 100  **Title:** TSM · FinOps Intelligence · Document Processor
**Vertical:** finops, finance, tax, vendor
**Signals:** actions=7, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/finops-suite/financial-ui.html
**Score:** 100  **Title:** TSM Financial Operations · Start Here
**Vertical:** healthcare, construction, insurance, finops, finance, tax, vendor, crm, approval
**Signals:** actions=5, report-actions=5
**Headings:** FinOps WIP Intelligence | Financial Accounting is now the operational foundation of the FinOps Suite. | FinOps WIP + Billing | ACCOUNTING PoC | UNIVERSAL WIP

### html/finops-suite/finops-accounting.html
**Score:** 100  **Title:** TSM FinOps · Financial Accounting Command
**Vertical:** finops
**Signals:** actions=8, report-actions=5
**Likely guidance gaps:** HOW-TO, EXECUTION

### html/finops-suite/finops-main-strategist/index.html
**Score:** 100  **Title:** TSM · FinOps Main Strategist · Controller Action Plan
**Vertical:** finops, tax, vendor, approval
**Signals:** actions=7, report-actions=6
**Likely guidance gaps:** HOW-TO

### html/finops-suite/finops-main-strategist/index1.html
**Score:** 100  **Title:** FinOps Main Strategist · TSM
**Vertical:** finops, tax, vendor, approval
**Signals:** actions=5, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/finops-suite/finops-main-strategist/main-strategist.html
**Score:** 100  **Title:** FinOps Main Strategist
**Vertical:** finops, tax, vendor
**Signals:** actions=6, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** ▸ FinOps Main Strategist

### html/finops-suite/finops-main-strategist/manager-bar-patch.html
**Score:** 100  **Title:** FinOps Main Strategist · TSM
**Vertical:** finops, tax, vendor, approval
**Signals:** actions=8, report-actions=5
**Likely guidance gaps:** HOW-TO

### html/finops-suite/finops-operations.html
**Score:** 100  **Title:** TSM FinOps · Operations Suite
**Vertical:** insurance, finops, property, vendor, crm
**Signals:** actions=8, report-actions=5
**Likely guidance gaps:** HOW-TO

### html/finops-suite/finops-presentation.html
**Score:** 100  **Title:** TSM · FinOps Suite
**Vertical:** healthcare, construction, insurance, finops, finance, tax, vendor, crm, approval
**Signals:** actions=1, report-actions=3
**Likely guidance gaps:** HOW-TO
**Headings:** Your finance team is flying blind. | CRCR Exam Readiness — 5 Domains · 75 Questions · AI-Powered Coaching | FinOps Hub — Financial UI | FinOps Operations Suite | 4-Engine Doc Analysis | Accounting Doc POC | Staff Accountant Interview Suite | FinOps Scenario Engine

### html/finops-suite/finops-presentation/index.html
**Score:** 100  **Title:** TSM · FinOps Suite
**Vertical:** healthcare, construction, insurance, finops, finance, tax, vendor, crm, approval
**Signals:** actions=1, report-actions=3
**Likely guidance gaps:** HOW-TO
**Headings:** Your finance team is flying blind. | CRCR Exam Readiness — 5 Domains · 75 Questions · AI-Powered Coaching | FinOps Hub — Financial UI | FinOps Operations Suite | 4-Engine Doc Analysis | Accounting Doc POC | Staff Accountant Interview Suite | FinOps Scenario Engine

### html/finops-suite/finops-scenarios.html
**Score:** 100  **Title:** FinOps Scenario Engine · TSM Academy
**Vertical:** healthcare, finops, finance, tax, vendor, approval
**Signals:** actions=4, report-actions=4
**Likely guidance gaps:** HOW-TO
**Headings:** FinOps Scenario Engine | 4-ENGINE DOC ANALYSIS PIPELINE — State-of-the-Art Financial Document Processing | POC DOCUMENT PORTAL — CFO Memos · Executive Briefings · Variance Reports | AP Aging Crisis — $312K Outstanding · 3 Vendors on Credit Hold | MISSION OBJECTIVES — COMPLETE IN ORDER | GL Variance Investigation — Revenue $2.4M vs $2.8M Budget (-14.3%) | MISSION OBJECTIVES | Bank Recon + Cash Flow Alert — $48K Variance · 3 Accounts Flagged

### html/finops-suite/finops-showcase-v1.html
**Score:** 100  **Title:** FinOps Doc Showcase
**Vertical:** finops, vendor
**Signals:** actions=6, report-actions=5
**Likely guidance gaps:** HOW-TO

### html/finops-suite/finops-showcase-v2.html
**Score:** 100  **Title:** TSM · FinOps Doc Showcase · 4-Engine BNCA
**Vertical:** logistics, finops, tax, vendor, approval
**Signals:** actions=6, report-actions=6
**Likely guidance gaps:** HOW-TO

### html/finops-suite/finops-showcase/index.html
**Score:** 100  **Title:** TSM · FINOPS DOC SHOWCASE
**Vertical:** finops, vendor
**Signals:** actions=6, report-actions=3

### html/finops-suite/finops-war/finops-executive-portal.html
**Score:** 100  **Title:** FinOps Executive Portal · TSM
**Vertical:** finops, vendor
**Signals:** actions=4, report-actions=2
**Likely guidance gaps:** HOW-TO

### html/finops-suite/finops-war/finops-main-strategist.html
**Score:** 100  **Title:** TSM · FinOps Main Strategist · Controller Action Plan
**Vertical:** finops, finance, tax, vendor, approval
**Signals:** actions=7, report-actions=6
**Likely guidance gaps:** HOW-TO

### html/finops-suite/finops-war/finops-war-room.html
**Score:** 100  **Title:** FinOps War Room · TSM
**Vertical:** finops, tax, vendor, approval
**Signals:** actions=8, report-actions=6
**Headings:** ⚡ HOW TO USE — FINOPS WAR ROOM | STEP 1 — LOAD YOUR DOCUMENT | STEP 2 — CONFIGURE API KEY | STEP 3 — FIRE ALL 6 ENGINES | STEP 4 — DOWNSTREAM WORKFLOW | ⚠ FINOPS WAR ROOM — DEFECT MANIFEST

### html/finops-suite/how-to-finops-updated.html
**Score:** 100  **Title:** FinOps Suite — How To Guide
**Vertical:** healthcare, construction, insurance, finops, finance, tax, vendor
**Signals:** actions=2, report-actions=1
**Headings:** Everything in one place. | Up and running in 5 minutes. | Every page in the FinOps Suite. | What is WIP Intelligence? | Where WIP Intelligence appears | The Financial Intelligence Charts. | The live API behind the charts. | Endpoint

### html/finops-suite/how-to-finops.html
**Score:** 100  **Title:** FinOps Suite — How To Guide
**Vertical:** healthcare, finops, tax, vendor, crm, approval
**Signals:** actions=2, report-actions=6

### html/finops-suite/how-to.html
**Score:** 100  **Title:** FinOps Suite · How To Guide · TSM
**Vertical:** legal, logistics, finops, tax, vendor, crm, approval
**Signals:** actions=2, report-actions=5
**Headings:** How To Run Autonomous Financial Command | Suite Overview | Daily Workflows | 6 Copilot Lanes | Step-by-Step Walkthrough

### html/finops-suite/index-elevated.html
**Score:** 100  **Title:** TSM Financial Intelligence Pro
**Vertical:** healthcare, construction, mortgage, insurance, legal, schools, finops, finance, tax
**Signals:** actions=6, report-actions=1

### html/finops-suite/staff-accountant-interview.html
**Score:** 100  **Title:** TSM FinOps · Staff Accountant Interview Suite
**Vertical:** insurance, legal, logistics, finops, finance, property, vendor, approval
**Signals:** actions=6, report-actions=4

### html/finops-suite/study-guide.html
**Score:** 100  **Title:** TSM Platform Guide · How To Use Everything
**Vertical:** healthcare, insurance, legal, finops, finance, tax, vendor
**Signals:** actions=1, report-actions=1
**Headings:** Everything You Need to Know About the TSM Platform | Where to Begin | 🏥 Start Here for Healthcare / CRCR | 📊 Start Here for Accounting / FinOps | HC Practice Hub — Complete Feature Map | Dashboard — Daily Command View | CRCR · RCM Practice Lab | Denial Lab

### html/finops-suite/tax.html
**Score:** 100  **Title:** AuditOps Pro · TSM AI Tax Intelligence Platform
**Vertical:** construction, mortgage, real estate, legal, finops, tax, itops
**Signals:** actions=7, report-actions=5

### html/finops-suite/tsm-finops-pitch.html
**Score:** 100  **Title:** TSM FinOps Intelligence Suite — Client Demo
**Vertical:** finops, finance, tax, vendor, crm, approval
**Signals:** actions=5, report-actions=3
**Likely guidance gaps:** HOW-TO
**Headings:** Your Accounting Already Running. | What you're actually buying when you hire. | Eight nodes. One operating layer. | Every module. Running right now. | Show them in this order. | TSM FinOps vs. the hire. | TSM FinOps · $1,750/mo | Staff Accountant · $6,500–$9,000/mo

### html/finops-suite/tsm-presentation.html
**Score:** 100  **Title:** TSM · FinOps Suite · Executive Presentation
**Vertical:** construction, insurance, finops, finance, tax, vendor, approval
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/finops-suite/tsm-rcm-os-howto.html
**Score:** 100  **Title:** TSM RCM OS — How-To Guide
**Vertical:** construction, insurance, legal, logistics, finops, finance, tax, supplier, vendor
**Signals:** actions=1, report-actions=5
**Headings:** What RCM OS Is — and Isn't | Getting Oriented | Data Intake: FinOps Doc Showcase → RCM OS | Cross-Module Exceptions | The AI Assistant | Running Your Day in RCM OS | Running Your Week in RCM OS | Running Month-End in RCM OS

### html/finops-suite/tsm-rcm-os.html
**Score:** 100  **Title:** TSM RCM OS — Reconciliation Command Center
**Vertical:** logistics, finops, supplier, vendor
**Signals:** actions=4, report-actions=4
**Likely guidance gaps:** DECISION
**Headings:** Reconciliation Management OS | Executive Summary

### html/finops-suite/wip/index.html
**Score:** 100  **Title:** TSM · FinOps WIP Intelligence
**Vertical:** finops, finance, approval
**Signals:** actions=5, report-actions=2
**Likely guidance gaps:** HOW-TO
**Headings:** FINOPS WIP INTELLIGENCE

### html/finops-suite/zero-trust.html
**Score:** 100  **Title:** TSM Zero-Trust | Enterprise Access Command
**Vertical:** construction, mortgage, legal, hotel, hotelops, finops, finance, tax, itops, vendor
**Signals:** actions=7, report-actions=3

### html/ghs_onepager.html
**Score:** 100  **Title:** GHS Healthcare Command Suite — One Pager
**Vertical:** healthcare
**Signals:** actions=2, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** Stop managing data. Start commanding outcomes.

### html/go-to-market.html
**Score:** 100  **Title:** BNCA Healthcare GTM Study Page · TSM Command Mode
**Vertical:** healthcare, insurance, tax, vendor
**Signals:** actions=2, report-actions=1
**Headings:** We tell your office what to do next. | Homepage + conversion copy | Demo script for closing deals | Lead magnet funnel for cold traffic | Presentation notes for Thursday

### html/hc-billing.tsmatter.html
**Score:** 100  **Title:** HC Billing Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/hc-compliance.tsmatter.html
**Score:** 100  **Title:** HC Compliance Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/hc-demo-flow.html
**Score:** 100  **Title:** HC Presentation Flow · Tomorrow's Demo
**Vertical:** healthcare, construction, insurance, finance, vendor, approval
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO
**Headings:** HC Sovereign Mesh Full Demo Flow

### html/hc-demo-presentation.html
**Score:** 100  **Title:** TSM &middot; Healthcare &middot; Demo Presentation
**Vertical:** healthcare, construction, bpo, real estate, insurance, legal, finops, tax, vendor
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** One denial. Three-stage relay. Fourteen command modules. | The full Healthcare command surface | How a denial becomes an executive-ready brief | What's live today &mdash; and what's still roadmap | See the relay chain live

### html/hc-financial.tsmatter.html
**Score:** 100  **Title:** HC Financial Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/hc-grants.tsmatter.html
**Score:** 100  **Title:** HC Grants Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/hc-insurance.tsmatter.html
**Score:** 100  **Title:** HC Insurance Command
**Vertical:** insurance, finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/hc-legal.tsmatter.html
**Score:** 100  **Title:** HC Legal Command
**Vertical:** legal, finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/hc-medical.tsmatter.html
**Score:** 100  **Title:** HC Medical Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/hc-pharmacy.tsmatter.html
**Score:** 100  **Title:** HC Pharmacy Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/hc-strategist.tsmatter.html
**Score:** 100  **Title:** HC Strategist Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/hc-taxprep.tsmatter.html
**Score:** 100  **Title:** HC Tax Prep Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/hc-vendors.tsmatter.html
**Score:** 100  **Title:** HC Vendors Command
**Vertical:** finance, tax, vendor, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/healthcare-demo-script.html
**Score:** 100  **Title:** Healthcare RCM WIP — Live Demo Script
**Vertical:** healthcare, construction, insurance, finops, vendor
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO
**Headings:** Healthcare RCM WIP Intelligence Dashboard

### html/healthcare/executive-portal.html
**Score:** 100  **Title:** TSM · RCM Executive Command
**Vertical:** healthcare, legal, vendor
**Signals:** actions=7, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/healthcare/hc-academy/crcc-scenarios.html
**Score:** 100  **Title:** CRCR Operational Scenarios · TSM Academy
**Vertical:** healthcare, bpo, insurance, legal, finance, tax, vendor, approval
**Signals:** actions=3, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** CRCR Operational Scenario Engine | POC DOCUMENT PORTAL — State-of-the-Art Healthcare Document Processing | CO-29 Timely Filing — $3,800 Write-Off Risk | MISSION OBJECTIVES — COMPLETE IN ORDER | CPT 99215 Upcoding Audit — 23 Claims | MISSION OBJECTIVES | 6 Pending Auths — Medicare & Aetna · SLA Breach Risk | MISSION OBJECTIVES

### html/healthcare/hc-academy/crcr-scenarios.html
**Score:** 100  **Title:** CRCR Operational Scenarios · TSM Academy
**Vertical:** healthcare, bpo, insurance, legal, finance, tax, vendor, approval
**Signals:** actions=3, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** CRCR Operational Scenario Engine | POC DOCUMENT PORTAL — State-of-the-Art Healthcare Document Processing | CO-29 Timely Filing — $3,800 Write-Off Risk | MISSION OBJECTIVES — COMPLETE IN ORDER | CPT 99215 Upcoding Audit — 23 Claims | MISSION OBJECTIVES | 6 Pending Auths — Medicare & Aetna · SLA Breach Risk | MISSION OBJECTIVES

### html/healthcare/hc-academy/poc-html/index.html
**Score:** 100  **Title:** HC Command Center · Guided PoC
**Vertical:** healthcare
**Signals:** actions=7, report-actions=4
**Likely guidance gaps:** HOW-TO

### html/healthcare/hc-billing/index.html
**Score:** 100  **Title:** HC BILLING COMMAND · TSM Healthcare
**Vertical:** healthcare
**Signals:** actions=7, report-actions=2
**Likely guidance gaps:** HOW-TO

### html/healthcare/hc-compliance/index.html
**Score:** 100  **Title:** HC COMPLIANCE COMMAND · TSM Healthcare
**Vertical:** healthcare
**Signals:** actions=7, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/healthcare/hc-denial-war-room.html
**Score:** 100  **Title:** TSM · Denial Recovery War Room
**Vertical:** healthcare
**Signals:** actions=9, report-actions=6
**Headings:** ⚡ HOW TO USE — HC DENIAL WAR ROOM | STEP 1 — LOAD YOUR DOCUMENT | STEP 2 — CONFIGURE API KEY | STEP 3 — FIRE ALL 5 ENGINES | STEP 4 — DOWNSTREAM WORKFLOW | ⚠ HC DENIAL WAR ROOM — DEFECT MANIFEST

### html/healthcare/hc-financial/index.html
**Score:** 100  **Title:** HC FINANCIAL COMMAND · TSM Healthcare
**Vertical:** healthcare
**Signals:** actions=8, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/healthcare/hc-grants/index.html
**Score:** 100  **Title:** HC GRANTS COMMAND · TSM Healthcare
**Vertical:** healthcare
**Signals:** actions=8, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/healthcare/hc-insurance/index.html
**Score:** 100  **Title:** HC INSURANCE COMMAND · TSM Healthcare
**Vertical:** healthcare, insurance
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/healthcare/hc-legal/index.html
**Score:** 100  **Title:** HC LEGAL COMMAND · TSM Healthcare
**Vertical:** healthcare, legal
**Signals:** actions=7, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/healthcare/hc-main-strategist.html
**Score:** 100  **Title:** HC Strategist · Healthcare · Neural Core
**Vertical:** healthcare, insurance, tax, vendor
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/healthcare/hc-medical/index.html
**Score:** 100  **Title:** HC MEDICAL COMMAND · TSM Healthcare
**Vertical:** healthcare, approval
**Signals:** actions=7, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/healthcare/hc-operations/index.html
**Score:** 100  **Title:** HC OPERATIONS COMMAND · TSM Healthcare
**Vertical:** healthcare, vendor
**Signals:** actions=8, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/healthcare/hc-pharmacy/index.html
**Score:** 100  **Title:** HC PHARMACY COMMAND · TSM Healthcare
**Vertical:** healthcare, vendor
**Signals:** actions=8, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/healthcare/hc-strategist/index.html
**Score:** 100  **Title:** HC STRATEGIST · TSM Healthcare Full System
**Vertical:** healthcare, insurance
**Signals:** actions=8, report-actions=3
**Headings:** ${tab}

### html/healthcare/hc-taxprep/index.html
**Score:** 100  **Title:** HC TAX PREP COMMAND · TSM Healthcare
**Vertical:** healthcare, legal, tax
**Signals:** actions=8, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/healthcare/hc-vendors/index.html
**Score:** 100  **Title:** HC VENDORS COMMAND · TSM Healthcare
**Vertical:** healthcare, insurance, legal, logistics, supplier, vendor
**Signals:** actions=8, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/honorhealth-revenue-leak-snapshot.html
**Score:** 100  **Title:** HonorHealth — Revenue Leak Snapshot | TSM Consultz
**Vertical:** healthcare, insurance, finops
**Signals:** actions=1, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** HonorHealth — Revenue Leak Snapshot

### html/hotelops/hotelops-howto.html
**Score:** 100  **Title:** GID | HotelOps — How-To Guide
**Vertical:** hotel, hotelops, property
**Signals:** actions=1, report-actions=1
**Headings:** What's in HotelOps, and how to use it | Reservations sidebar → Reservations | Front Desk sidebar → Front Desk | VIP Arrivals sidebar → VIP Arrivals | Housekeeping sidebar → Housekeeping | Maintenance sidebar → Maintenance | IoT / Smart Systems sidebar → IoT / Smart Systems | Staff Operations sidebar → Staff Operations

### html/hotelops/hotelops-war-room.html
**Score:** 100  **Title:** GID | HotelOps War Room
**Vertical:** hotel, hotelops, property
**Signals:** actions=6, report-actions=1
**Likely guidance gaps:** EXECUTION, OUTPUT

### html/ins-presentation/index.html
**Score:** 100  **Title:** TSM · Insurance Intelligence Suite · Live Executive Demo
**Vertical:** healthcare, insurance, approval
**Signals:** actions=4, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/inty-finops-offer/index.html
**Score:** 100  **Title:** TSM Financial Operations Layer · Inty Power
**Vertical:** finops, tax, vendor, approval
**Signals:** actions=2, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** Accounting execution, compliance visibility, and executive reporting — as a system. | How TSM Meets the Staff Accountant Requirements | What Inty Power Gets for $1,750/month | Recommended Start

### html/inty-power-finops-presentation.html
**Score:** 100  **Title:** TSM FinOps · Inty Power Staff Accountant
**Vertical:** finops, tax, supplier, vendor
**Signals:** actions=4, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE

### html/inty-power-finops-presentation/index.html
**Score:** 100  **Title:** TSM FinOps · Inty Power Staff Accountant
**Vertical:** finops, tax, supplier, vendor
**Signals:** actions=4, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE

### html/l1-copilot/enterprise-command-center.html
**Score:** 100  **Title:** TSM Enterprise Command Center
**Vertical:** noc
**Signals:** actions=7, report-actions=1
**Headings:** VMware Digital Twin | Network Digital Twin | Active Directory Digital Twin (Users) | Device Digital Twin | SLA Summary | AI Risk Scoring | Technician Performance | Historical Analytics

### html/l1-copilot/l1-ticket-copilot.html
**Score:** 100  **Title:** TSM L1 Ticket Copilot
**Vertical:** healthcare, construction, real estate, legal, finops, finance, noc, vendor, catalog
**Signals:** actions=9, report-actions=2
**Headings:** 🔐 Account Lockout | First Response Checklist | Escalate When | Ticket | AI Analysis | Troubleshooting | Imaging | AD / Intune

### html/l1-copilot/tsm-itops-demo-presentation.html
**Score:** 100  **Title:** TSM // IT Ops Suite — Virtual Ecosystem Demo
**Vertical:** itops, vendor, catalog
**Signals:** actions=2, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** Two apps. One living IT ecosystem. | Most ticketing tools don't know what they're looking at . | Four digital twins , one live state. | Same model. Two vantage points . | The intelligence layer above the twins. | Where a technician meets the twin. | Four SMEs, on call . | Every ticket feeds the twin back.

### html/l1-copilot/vmware-copilot.html
**Score:** 100  **Title:** TSM VMware Operations Copilot
**Vertical:** catalog
**Signals:** actions=7, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/legal-demo-presentation.html
**Score:** 100  **Title:** TSM &middot; Legal &middot; Demo Presentation
**Vertical:** healthcare, construction, legal, finops, tax, itops
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** One matter. Three-stage relay. Five persona-tab modules. | The full Legal command surface | How a matter becomes an executive-ready brief | What's live today &mdash; and what's still roadmap | See the relay chain live

### html/legal-main-strategist.html
**Score:** 100  **Title:** TSM · Case Strategist · Legal-Pro
**Vertical:** legal
**Signals:** actions=4, report-actions=2
**Likely guidance gaps:** HOW-TO
**Headings:** Case Strategist

### html/legal-pro/case-strategist.html
**Score:** 100  **Title:** TSM Legal Main Strategist
**Vertical:** real estate, legal, property
**Signals:** actions=8, report-actions=2
**Likely guidance gaps:** HOW-TO
**Headings:** TSM LEGAL MAIN STRATEGIST | SELECT SCENARIO · LEGAL INTELLIGENCE MODE | EXECUTIVE PORTAL · legal-executive-portal.html

### html/legal-pro/index.html
**Score:** 100  **Title:** TSM Legal Pro Suite · TSM Consultz
**Vertical:** healthcare, construction, bpo, real estate, legal, property, vendor, crm
**Signals:** actions=8, report-actions=5
**Likely guidance gaps:** HOW-TO

### html/legal-pro/legal-account.html
**Score:** 100  **Title:** TSM FinOps · Financial Accounting POC
**Vertical:** legal, finops
**Signals:** actions=8, report-actions=7
**Likely guidance gaps:** HOW-TO
**Headings:** Reports to FinOps Strategist

### html/legal-pro/legal-compliance.html
**Score:** 100  **Title:** Legal Compliance · TSM Legal-Pro
**Vertical:** legal
**Signals:** actions=4, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** Legal Compliance

### html/legal-pro/legal-tax.html
**Score:** 100  **Title:** AuditOps Pro · TSM AI Tax Intelligence Platform
**Vertical:** construction, mortgage, real estate, legal, tax, itops
**Signals:** actions=7, report-actions=5

### html/legal-pro/legal-trust.html
**Score:** 100  **Title:** TSM Zero-Trust | Enterprise Access Command
**Vertical:** construction, mortgage, legal, hotel, hotelops, finops, finance, tax, itops, vendor
**Signals:** actions=5, report-actions=3

### html/logistics/logistics-situation-room.html
**Score:** 100  **Title:** TSM · Logistics Situation Room
**Vertical:** logistics
**Signals:** actions=7, report-actions=5
**Likely guidance gaps:** HOW-TO

### html/mortgage-demo-presentation.html
**Score:** 100  **Title:** TSM &middot; Mortgage &middot; Demo Presentation
**Vertical:** mortgage, logistics, supplier, vendor
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** One loan breach. Direct relay. Real executive actions, not toasts. | The full Mortgage command surface | How a loan breach becomes an executive-ready brief | What's live today &mdash; and what's still roadmap | See the relay chain live

### html/mortgage/index.html
**Score:** 100  **Title:** TSM Financial Intelligence Pro
**Vertical:** healthcare, construction, mortgage, insurance, legal, schools, finance, tax
**Signals:** actions=5, report-actions=1

### html/pc-command.tsmatter.html
**Score:** 100  **Title:** PC Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/pc-command/index.html
**Score:** 100  **Title:** P&C Enterprise Command · TSM
**Vertical:** construction, property
**Signals:** actions=6, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** P&C ENTERPRISE COMMAND | ⚡ Revenue + Risk Action Engine | ${key}

### html/plant-incident.html
**Score:** 100  **Title:** TSM · Plant Incident Command Center
**Vertical:** supplier
**Signals:** actions=5, report-actions=2
**Likely guidance gaps:** HOW-TO, EXECUTION

### html/real-estate-demo-presentation.html
**Score:** 100  **Title:** TSM &middot; Real Estate &middot; Demo Presentation
**Vertical:** mortgage, real estate, finance
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** One deal. Three-stage relay. Seven node groups, fourteen modules. | The full Real Estate command surface | How a deal becomes an executive-ready brief | What's live today &mdash; and what's still roadmap | See the relay chain live

### html/reo-command.html
**Score:** 100  **Title:** Real Estate Command
**Vertical:** mortgage, real estate, finance, tax, itops, property
**Signals:** actions=9, report-actions=2
**Likely guidance gaps:** HOW-TO

### html/reo-pro.tsmatter.html
**Score:** 100  **Title:** REO Pro Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/reo-pro/index.html
**Score:** 100  **Title:** RealtyOps AI | Real Estate Intelligence Command Center
**Vertical:** healthcare, bpo, mortgage, real estate, insurance, legal, finance, tax, itops, property, crm
**Signals:** actions=8, report-actions=4

### html/reo-pro/re-doc-search.html
**Score:** 100  **Title:** TSM · RE DOCUMENT COMMAND
**Vertical:** bpo, mortgage, real estate, finance, property
**Signals:** actions=9, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/reo-pro/re-guide.html
**Score:** 100  **Title:** TSM // RE PLATFORM GUIDE
**Vertical:** bpo, mortgage, real estate, insurance, legal, finops, finance, property, crm, approval
**Signals:** actions=3, report-actions=5

### html/rrd-command.tsmatter.html
**Score:** 100  **Title:** RRD Command
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/sentinel-center.html
**Score:** 100  **Title:** TSM Sentinel Strategist Center
**Signals:** actions=4, report-actions=4
**Likely guidance gaps:** HOW-TO
**Headings:** TSM Sentinel — Board Snapshot | Strategist Standings | Cross-Vertical Causality Board

### html/sentinel-how-to.html
**Score:** 100  **Title:** How To Use TSM Sentinel Strategist Center
**Vertical:** healthcare, construction, bpo, mortgage, real estate, insurance, legal, schools, finops, noc
**Signals:** actions=1, report-actions=3
**Headings:** Using TSM Sentinel Strategist Center | &#9432; What Sentinel Is (and Isn't) | 1 Configure Verticals | 2 The KPI Row | 3 Business Posture Score, Explained | 4 Cross-Vertical Causality Board | 5 Strategist Standings | 6 BNCA Impact Analysis

### html/strategist-index.html
**Score:** 100  **Title:** Sovereign Strategist | The Ultimate Business Consultant
**Vertical:** construction, mortgage, real estate, insurance, legal, schools, hotel, hotelops, finance, tax, itops, property, vendor
**Signals:** actions=6, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** Your Sovereign Business Intelligence Hub | All Eleven Platforms, One Command Center | Cross-App Workflows for Every Scenario | Ask Anything . Get Board-Level Counsel. | Sovereign Advisor | What the Strategist Knows | Navigate by Industry | Know Your Risk Before It Knows You

### html/strategist00.tsmatter.html
**Score:** 100  **Title:** Sovereign Strategist
**Vertical:** finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/suite-builder.html
**Score:** 100  **Title:** TSM · Presentation Suite Builder
**Vertical:** healthcare, real estate, insurance, finance
**Signals:** actions=9, report-actions=4
**Likely guidance gaps:** HOW-TO
**Headings:** ${cleanTitle}

### html/suite-builder/index.html
**Score:** 100  **Title:** TSM · Presentation Suite Builder
**Vertical:** healthcare, construction, bpo, mortgage, real estate, insurance, legal, schools, hotel, hotelops, finance, tax, itops, vendor
**Signals:** actions=8, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE

### html/supplier-shutdown.html
**Score:** 100  **Title:** TSM · Supplier Shutdown War Room
**Vertical:** supplier
**Signals:** actions=5, report-actions=2
**Likely guidance gaps:** HOW-TO, EXECUTION

### html/supplier-vendor/supplier-vendor-situation-room.html
**Score:** 100  **Title:** TSM · Supplier/Vendor Management Situation Room
**Vertical:** supplier, vendor
**Signals:** actions=7, report-actions=5
**Likely guidance gaps:** HOW-TO

### html/talktrack_expanded.html
**Score:** 100  **Title:** TSM Consultz · Honeywell Pitch · Extended Enterprise Talk Track
**Vertical:** healthcare, construction, bpo, real estate, insurance, legal, logistics, finops, supplier, vendor, crm, catalog, cpq, approval
**Signals:** actions=1, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/tax-prep.html
**Score:** 100  **Title:** AuditOps Pro · TSM AI Tax Intelligence Platform
**Vertical:** construction, mortgage, real estate, legal, tax, itops
**Signals:** actions=7, report-actions=5

### html/tax-prep/index.html
**Score:** 100  **Title:** AuditOps Pro · TSM AI Tax Intelligence Platform
**Vertical:** construction, mortgage, real estate, legal, tax, itops
**Signals:** actions=7, report-actions=5

### html/tsm-ab-study-plan.html
**Score:** 100  **Title:** TSM · AI-103 · Azure AI Apps & Agents Developer · 3-Week Plan
**Vertical:** healthcare, construction, bpo, insurance, legal, finops, approval
**Signals:** actions=7, report-actions=0
**Likely guidance gaps:** BUSINESS-VALUE

### html/tsm-bpo-daily-workflow-gtm.html
**Score:** 100  **Title:** TSM BPO DAILY WORKFLOW
**Vertical:** healthcare, construction, bpo, insurance, legal, finops, tax, property, vendor, approval
**Signals:** actions=6, report-actions=1

### html/tsm-candidate-readiness-v2.html
**Score:** 100  **Title:** TSM · Employee Readiness & Retention System
**Vertical:** healthcare, insurance, legal, logistics, finops
**Signals:** actions=6, report-actions=5
**Likely guidance gaps:** HOW-TO
**Headings:** Certification Levels | Readiness Dimensions | Placement Recommendation | Strengths | Development Plan

### html/tsm-career-os-guide.html
**Score:** 100  **Title:** TSM Career OS — User Guide
**Vertical:** healthcare, finops
**Signals:** actions=2, report-actions=1

### html/tsm-career-training-platform.html
**Score:** 100  **Title:** TSM Career Training Platform · Decision Intelligence Academy
**Vertical:** healthcare, construction, bpo, mortgage, real estate, insurance, legal, logistics, finops, finance, property, supplier, approval
**Signals:** actions=6, report-actions=3

### html/tsm-consultz-access.html
**Score:** 100  **Title:** TSM Client Access — Sovereign Intelligence Portal
**Vertical:** approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/tsm-consultz-portfolio.html
**Score:** 100  **Title:** TSM Consultz LLC | Latorrey Whitehead — Chief Solutions Architect
**Vertical:** healthcare, construction, bpo, mortgage, real estate, insurance, legal, finops, supplier
**Signals:** actions=7, report-actions=6
**Likely guidance gaps:** HOW-TO
**Headings:** We Study Your Vision. Then Build Your Solution. | Business Transformation Through Precision Engineering | Operational Intelligence Platforms | Document Portfolio Analyzer | System War Room | The Architect Behind TSM | Resume — Latorrey Whitehead | Available for Strategic Opportunities

### html/tsm-demo-playbook.html
**Score:** 100  **Title:** TSM DEMO PLAYBOOK — Tier 1 + Tier 2
**Vertical:** bpo, insurance, finops, approval
**Signals:** actions=3, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE

### html/tsm-doc-search-multi.html
**Score:** 100  **Title:** TSM Document Search · FinOps · Insurance · Construction · BPO
**Vertical:** healthcare, construction, bpo, mortgage, real estate, insurance, legal, schools, hotel, hotelops, logistics, finops, supplier, vendor, crm, catalog, cpq, approval
**Signals:** actions=8, report-actions=7
**Headings:** TSM · Document Router &amp; War Room Entry | ' + pkg.client + ' | What This Page Does | Typical flow | Uploading Documents | Business Verticals | Sending to a War Room | Auto Mode vs Manual

### html/tsm-how-to-guide.html
**Score:** 100  **Title:** TSM · How To Use the War Room Suite
**Vertical:** healthcare, construction, bpo, real estate, insurance, legal, finops, tax, vendor, approval
**Signals:** actions=3, report-actions=2
**Headings:** How to Use the War Room Suite | What Is the War Room Suite? | From Document to Resolution | Document Intake — The War Room | Run the 6-Engine Analysis Pipeline | The Mission Guide Panel | ⚡ Mission Guide = Your Personal Case Playbook | The Strategist

### html/tsm-insurance/az-ins.html
**Score:** 100  **Title:** AZ Insurance Command · NPN 18818059
**Vertical:** healthcare, mortgage, insurance, tax
**Signals:** actions=8, report-actions=4
**Headings:** ${key}

### html/tsm-insurance/compliance.html
**Score:** 100  **Title:** TSM Compliance Command | AI-Powered Regulatory Intelligence
**Vertical:** insurance, tax
**Signals:** actions=7, report-actions=3
**Likely guidance gaps:** HOW-TO
**Headings:** TSM COMPLIANCE COMMAND

### html/tsm-insurance/ins-appeals.html
**Score:** 100  **Title:** TSM Insurance · Appeals Command
**Vertical:** insurance, legal
**Signals:** actions=7, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE

### html/tsm-insurance/ins-claims.html
**Score:** 100  **Title:** TSM Insurance · Claims Command
**Vertical:** insurance, property
**Signals:** actions=8, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/tsm-insurance/ins-compliance.html
**Score:** 100  **Title:** TSM Insurance · Compliance Command
**Vertical:** insurance, tax
**Signals:** actions=8, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE

### html/tsm-insurance/ins-hub1.html
**Score:** 100  **Title:** TSM Insurance Command Hub
**Vertical:** healthcare, insurance, property
**Signals:** actions=7, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** Insurance Command Hub

### html/tsm-insurance/ins-intel.html
**Score:** 100  **Title:** TSM · Insurance Intelligence Hub
**Vertical:** insurance
**Signals:** actions=4, report-actions=1

### html/tsm-insurance/ins-liability.html
**Score:** 100  **Title:** TSM Insurance · Liability Command
**Vertical:** insurance
**Signals:** actions=8, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/tsm-insurance/ins-malpractice.html
**Score:** 100  **Title:** TSM Insurance · Malpractice Command
**Vertical:** insurance, legal
**Signals:** actions=8, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/tsm-insurance/ins-presentation.html
**Score:** 100  **Title:** TSM · Insurance Suite
**Vertical:** insurance, legal, property, approval
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** Your insurance operation is leaking revenue you can't see. | Insurance Hub | Claims Triage Module | Agent Onboarding Module | CE Study Prep | DME Billing Module + Benefits Page | BNCA Command Chain | AZ Insurance Command

### html/tsm-insurance/ins-underwriting.html
**Score:** 100  **Title:** TSM Insurance · Underwriting Command
**Vertical:** insurance, property
**Signals:** actions=8, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE

### html/tsm-insurance/insurance-claims-pro.html
**Score:** 100  **Title:** TSM Insurance Operations Academy · Claims Lab
**Vertical:** healthcare, insurance, legal
**Signals:** actions=9, report-actions=8
**Likely guidance gaps:** HOW-TO
**Headings:** Insurance Operations Academy · Claims Lab | DME Audit Failure — Incomplete CMN | MISSION OBJECTIVES | Prior Auth Denied — Step Therapy Not Met | MISSION OBJECTIVES | CO-197 Denial — Prior Auth Missing on Filed Claim | MISSION OBJECTIVES | Eligibility Failure — Coverage Terminated Mid-Service

### html/tsm-insurance/legal.html
**Score:** 100  **Title:** Legal Analyst Pro · TSM Consultz
**Vertical:** healthcare, construction, real estate, insurance, legal, property, vendor
**Signals:** actions=8, report-actions=4
**Likely guidance gaps:** HOW-TO

### html/tsm-insurance/pc-command.html
**Score:** 100  **Title:** TSM | P&C Enterprise Command
**Vertical:** healthcare, construction, mortgage, real estate, insurance, legal, finance, property
**Signals:** actions=9, report-actions=0
**Likely guidance gaps:** BUSINESS-VALUE
**Headings:** " + data.report_title + "

### html/tsm-insurance/tax-prep.html
**Score:** 100  **Title:** AuditOps Pro · TSM AI Tax Intelligence Platform
**Vertical:** construction, mortgage, real estate, insurance, legal, tax, itops
**Signals:** actions=7, report-actions=5

### html/tsm-insurance/tsm-demo-launcher.html
**Score:** 100  **Title:** TSM · Demo Launcher
**Vertical:** healthcare, construction, insurance, finops
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** BUSINESS-VALUE
**Headings:** Demo Launcher

### html/tsm-insurance/tsm-insurance-suite-index.html
**Score:** 100  **Title:** TSM · Insurance Suite
**Vertical:** healthcare, insurance, finops
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** BUSINESS-VALUE

### html/tsm-insurance/wip/index.html
**Score:** 100  **Title:** TSM · Insurance Claims WIP
**Vertical:** insurance
**Signals:** actions=5, report-actions=2
**Likely guidance gaps:** HOW-TO
**Headings:** INSURANCE CLAIMS WIP COMMAND

### html/tsm-job-prep.html
**Score:** 100  **Title:** TSM Career OS — Healthcare Ops Simulator
**Vertical:** healthcare, finops, approval
**Signals:** actions=7, report-actions=2

### html/tsm-job-prep1.html
**Score:** 100  **Title:** TSM Career OS — Healthcare Ops Simulator
**Vertical:** healthcare, finops, approval
**Signals:** actions=7, report-actions=2

### html/tsm-landing.html
**Score:** 100  **Title:** TSM — Total Solution Management
**Vertical:** healthcare, construction, bpo, insurance, finops, supplier
**Signals:** actions=2, report-actions=1
**Headings:** What takes BPOs days takes TSM minutes. | Your team is doing 3-day work that should take 20 minutes. | Built for three types of Phoenix operators. | How to run a 15-minute meeting. | Open any of these right now.

### html/tsm-marketing-platform.html
**Score:** 100  **Title:** TSM Consultz — Time Sensitive Matters
**Vertical:** healthcare, construction, bpo, mortgage, real estate, insurance, legal, vendor
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** Phoenix Doesn't Need More AI Promises. Phoenix Needs Results.

### html/tsm-operations-one-pager.html
**Score:** 100  **Title:** TSM Shell — Operations One-Pager
**Vertical:** healthcare, insurance, legal
**Signals:** actions=1, report-actions=1
**Likely guidance gaps:** HOW-TO, OUTPUT

### html/tsm-platform-hub.html
**Score:** 100  **Title:** TSM-Consultz — Platform Hub
**Vertical:** healthcare, construction, bpo, mortgage, real estate, insurance, legal, schools, hotel, hotelops, finops, noc, supplier, crm, catalog, cpq, approval
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** TSM-Consultz Platform Hub

### html/tsm-shell-bpo-tax-portal.html
**Score:** 100  **Title:** TSM Shell
**Vertical:** bpo, finance, tax, approval
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/tsm-solutions.html
**Score:** 100  **Title:** TSM — Total Solution Management
**Vertical:** healthcare, construction, bpo, real estate, insurance, legal, finops, finance, supplier, vendor
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** BUSINESS-VALUE
**Headings:** What takes BPOs days takes TSM minutes. | Your team is doing 3-day work that should take 20 minutes. | Built for operators across every vertical. | How to run a 15-minute meeting. | Open any of these right now.

### html/tsm-staffing-one-pager.html
**Score:** 100  **Title:** TSM Shell — Staffing One-Pager
**Vertical:** healthcare, bpo, insurance
**Signals:** actions=1, report-actions=1
**Likely guidance gaps:** HOW-TO, OUTPUT

### html/tsm-strategy.html
**Score:** 100  **Title:** TSM Matter — Master Strategy <title>TSM Matter — Master Strategy & RRD Pitch
**Vertical:** healthcare, construction, bpo, mortgage, real estate, insurance, legal, hotel, hotelops, tax, itops, vendor, approval
**Signals:** actions=2, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** AI that wins enterprise contracts across every sector | 9 sectors, one integrated platform | Build in this exact order | Document Intelligence — live now | Healthcare complete package | Financial + Tax bundle | Legal + Compliance bundle | Mortgage + Real estate bundle

### html/war-rooms/bpo-war/bpo-demo-presentation.html
**Score:** 100  **Title:** TSM &middot; BPO / Supply Chain &middot; Demo Presentation
**Vertical:** healthcare, construction, bpo, supplier
**Signals:** actions=4, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** BPO &amp; Supply Chain Decision Intelligence | Core relay chain + supporting workflow pages | One relay chain, three pages, no re-entry of data | Click through the acts &mdash; talk points included | What's live today | Run it live

### html/war-rooms/bpo-war/bpo-executive-portal.html
**Score:** 100  **Title:** TSM · BPO Executive Portal
**Vertical:** bpo, approval
**Signals:** actions=5, report-actions=2
**Likely guidance gaps:** HOW-TO

### html/war-rooms/bpo-war/bpo-strategist.html
**Score:** 100  **Title:** TSM · BPO Decision Intelligence
**Vertical:** bpo
**Signals:** actions=5, report-actions=3
**Likely guidance gaps:** HOW-TO

### html/war-rooms/bpo-war/bpo-war-room.html
**Score:** 100  **Title:** TSM · BPO Situation Room
**Vertical:** bpo, catalog, approval
**Signals:** actions=7, report-actions=5
**Likely guidance gaps:** HOW-TO

### html/war-rooms/construct-war/construction-executive-portal.html
**Score:** 100  **Title:** TSM Construction Executive Portal
**Vertical:** construction, legal, itops
**Signals:** actions=5, report-actions=3
**Likely guidance gaps:** HOW-TO
**Headings:** Construction Executive Decision Report | $0 | 20/100 | Pending | $0

### html/war-rooms/construct-war/construction-strategist.html
**Score:** 100  **Title:** Construction Strategist · TSM
**Vertical:** construction, insurance, legal, finance, tax, itops, vendor
**Signals:** actions=6, report-actions=1
**Likely guidance gaps:** HOW-TO

### html/war-rooms/construct-war/construction-war-room.html
**Score:** 100  **Title:** TSM Construction War Room
**Vertical:** construction, legal, itops
**Signals:** actions=9, report-actions=6

### html/war-rooms/governance/governance-executive-portal.html
**Score:** 100  **Title:** TSM &middot; Governance & Risk Executive Portal
**Signals:** actions=4, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/governance/governance-strategist.html
**Score:** 100  **Title:** TSM &middot; Governance & Risk Strategist
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/governance/governance-war-room.html
**Score:** 100  **Title:** TSM Governance & Compliance
**Signals:** actions=4, report-actions=1
**Likely guidance gaps:** HOW-TO, EXECUTION

### html/war-rooms/insure-war/insurance-executive-portal.html
**Score:** 100  **Title:** Insurance Executive Portal · TSM
**Vertical:** insurance, approval
**Signals:** actions=4, report-actions=2
**Likely guidance gaps:** HOW-TO

### html/war-rooms/insure-war/insurance-strategist.html
**Score:** 100  **Title:** Insurance Strategist · TSM
**Vertical:** insurance, approval
**Signals:** actions=8, report-actions=2
**Likely guidance gaps:** HOW-TO

### html/war-rooms/insure-war/insurance-war-room.html
**Score:** 100  **Title:** Insurance War Room · TSM
**Vertical:** insurance, approval
**Signals:** actions=9, report-actions=6
**Headings:** ⚡ HOW TO USE — INSURANCE WAR ROOM | STEP 1 — LOAD YOUR DOCUMENT | STEP 2 — CONFIGURE API KEY | STEP 3 — RUN THE ENGINE PIPELINE | STEP 4 — NARRATED TOUR | ⚠ INSURANCE WAR ROOM — DEFECT MANIFEST

### html/war-rooms/legal-war/legal-executive-portal.html
**Score:** 100  **Title:** TSM · Chief Strategist · Executive Portal
**Vertical:** legal, vendor, approval
**Signals:** actions=4, report-actions=2
**Likely guidance gaps:** HOW-TO, START, EXECUTION

### html/war-rooms/legal-war/legal-main-strategist.html
**Score:** 100  **Title:** TSM · Case Strategist · Legal-Pro
**Vertical:** legal
**Signals:** actions=4, report-actions=2
**Likely guidance gaps:** HOW-TO
**Headings:** Case Strategist

### html/war-rooms/legal-war/legal-war-room.html
**Score:** 100  **Title:** Legal War Room · TSM Legal-Pro
**Vertical:** legal, vendor
**Signals:** actions=9, report-actions=4

### html/war-rooms/mdm/mdm-strategist.html
**Score:** 100  **Title:** TSM MDM Strategist
**Signals:** actions=4, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE

### html/war-rooms/mdm/mdm-war-room.html
**Score:** 100  **Title:** TSM MDM War Room
**Signals:** actions=4, report-actions=1
**Likely guidance gaps:** HOW-TO, START, EXECUTION

### html/war-rooms/mortgage/mortgage-war-room.html
**Score:** 100  **Title:** TSM Mortgage Command Center
**Vertical:** mortgage
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** BUSINESS-VALUE
**Headings:** ⚡ HOW TO USE — MORTGAGE COMMAND CENTER | STEP 1 — LOAD PIPELINE DATA | STEP 2 — WORK THE THREE ENTITY TABS | STEP 3 — READ THE KPI BAR &amp; STAGE TRACKER | STEP 4 — RUN ANALYSIS &amp; RELAY

### html/war-rooms/music-war/how-to-guide.html
**Score:** 100  **Title:** Music Command Center — How To Guide
**Vertical:** catalog
**Signals:** actions=5, report-actions=2
**Headings:** How To Build Songs the Right Way | Build Your Artist DNA First (This powers automatic improvement loops) | Can You Upload Songs & Instrumentals? | Understanding Your Three Agents | Song Structure — Section by Section | Draft + Analysis — Step by Step | Revision Mode — The Precision Tool | Generating Material From Scratch

### html/war-rooms/pm-copilot/pm-command.html
**Score:** 100  **Title:** TSM | PM Copilot War Room
**Vertical:** finance, vendor
**Signals:** actions=6, report-actions=0
**Likely guidance gaps:** HOW-TO, EXECUTION, BUSINESS-VALUE

### html/war-rooms/pm-copilot/pm-strategist.html
**Score:** 100  **Title:** TSM &middot; PM Copilot Strategist
**Vertical:** real estate
**Signals:** actions=5, report-actions=3
**Likely guidance gaps:** HOW-TO, EXECUTION
**Headings:** NO ACTIVE RELAY

### html/war-rooms/re-war/re-exec-portal.html
**Score:** 100  **Title:** TSM · RE EXEC PORTAL
**Vertical:** bpo, mortgage, real estate, property, approval
**Signals:** actions=5, report-actions=4
**Likely guidance gaps:** HOW-TO

### html/war-rooms/re-war/re-strategist.html
**Score:** 100  **Title:** TSM // RE STRATEGIST
**Vertical:** real estate
**Signals:** actions=7, report-actions=2
**Likely guidance gaps:** HOW-TO, EXECUTION

### html/war-rooms/re-war/re-war-room.html
**Score:** 100  **Title:** TSM // RE WAR ROOM
**Vertical:** bpo, mortgage, real estate, insurance, legal, finops, finance, property, approval
**Signals:** actions=9, report-actions=5

### html/war-rooms/schools-command/schools-command.html
**Score:** 100  **Title:** TSM School Command Center
**Vertical:** healthcare, mortgage, legal, schools, finance, tax, itops, vendor, crm, approval
**Signals:** actions=6, report-actions=5

### html/war-rooms/war-room-prep.html
**Score:** 100  **Title:** TSM — War Room Pre-Presentation Checklist
**Vertical:** healthcare, construction, bpo, mortgage, real estate, insurance, legal, finops, finance, tax, noc, property, supplier, vendor, crm, catalog, cpq, approval
**Signals:** actions=7, report-actions=3

### html/wia2.html
**Score:** 100  **Title:** WIA · Workforce Intelligence Platform
**Vertical:** healthcare, insurance, logistics, finops, approval
**Signals:** actions=6, report-actions=6
**Headings:** Readiness Dimensions | Strengths | Skill Gaps | Placement Recommendation

### html/zero-trust.html
**Score:** 100  **Title:** TSM Zero-Trust | Enterprise Access Command
**Vertical:** construction, mortgage, legal, hotel, hotelops, finops, finance, tax, itops, vendor
**Signals:** actions=6, report-actions=3

### html/zero-trust/index.html
**Score:** 100  **Title:** TSM Zero-Trust | Enterprise Access Command
**Vertical:** construction, mortgage, legal, hotel, hotelops, finops, finance, tax, itops, vendor
**Signals:** actions=5, report-actions=3

### html/finops-suite/finance-index.html
**Score:** 98  **Title:** TSM Financial Intelligence Pro
**Vertical:** insurance, finops, finance
**Signals:** actions=7, report-actions=1
**Likely guidance gaps:** DECISION

### html/l1-copilot/noc/noc-executive-portal.html
**Score:** 98  **Title:** TSM &middot; NOC Command Center Executive Portal
**Vertical:** noc
**Signals:** actions=3, report-actions=4
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/tsm-insurance/insurance-portal.html
**Score:** 98  **Title:** TSM Insurance Portal — Ingestion & Claims Dashboard
**Vertical:** insurance, vendor
**Signals:** actions=4, report-actions=3
**Likely guidance gaps:** HOW-TO, OUTPUT
**Headings:** 🛡 TSM Insurance Portal

### html/war-rooms/pm-copilot/pm-exec-portal.html
**Score:** 98  **Title:** TSM &middot; PM Copilot Executive Portal
**Signals:** actions=4, report-actions=4
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO ACTIVE RELAY

### html/bpo-service-delivery-system.html
**Score:** 97  **Title:** TSM-Consultz — BPO Service Delivery System
**Vertical:** healthcare, construction, bpo, mortgage, real estate, insurance, legal, schools, logistics, finops, supplier, vendor, approval
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** BPO Service Delivery System

### html/executive-portal-live.html
**Score:** 97  **Title:** TSM Executive Portal
**Vertical:** healthcare, construction, insurance, finops
**Signals:** actions=2, report-actions=1
**Likely guidance gaps:** HOW-TO, START

### html/property-accountant-demo-presentation.html
**Score:** 97  **Title:** TSM &middot; Property Accountant &middot; Demo Presentation
**Vertical:** healthcare, construction, insurance, tax, property, vendor, approval
**Signals:** actions=2, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** One property close. Real double-entry ledger. A revenue cycle you can click through. | The Property Accountant command surface | How a property close becomes an executive-ready package | Click-by-click walkthrough &mdash; every button, in order | What's live today &mdash; and what's still roadmap | Run the close live

### html/tsm-insurance/insurance-suite-index.html
**Score:** 95  **Title:** TSM · Insurance Suite · Command Index
**Vertical:** healthcare, construction, insurance, legal, finops, tax, property, approval
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** BUSINESS-VALUE
**Headings:** Insurance Intelligence Command Suite | Command Center Tabs | All Insurance Modules | Claims & Reserve WIP | Suite Highlights

### html/war-rooms/music-war/presentation-live.html
**Score:** 95  **Title:** ZY Music Command — Live Demo Presentation
**Vertical:** catalog
**Signals:** actions=6, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** ZY Music Command Live Product Demo | Creators don’t need more random lyrics. They need decisions. | Old workflow | New workflow | Music Command is online. | ZAY → RIYA → DJ | ZAY | RIYA

### html/concierge/concierge-executive-portal.html
**Score:** 94  **Title:** TSM · Concierge Transport Executive Portal
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** AWAITING STRATEGIST CONFIRMATION

### html/construction-suite/presentation.html
**Score:** 94  **Title:** TSM Construction Intelligence – Executive Demo
**Vertical:** construction, legal, finance, itops
**Signals:** actions=4, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** STOP LOSING MONEY ON EVERY JOB SITE | THE PROBLEM | THE SYSTEM | LIVE OPERATIONS VIEW | ONE CLICK ANALYSIS | DEEP INTELLIGENCE | DECISION ENGINE | BNCA OUTPUT

### html/ins-main-strategist/index.html
**Score:** 94  **Title:** Insurance Main Strategist
**Vertical:** insurance
**Signals:** actions=4, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** INSURANCE MAIN STRATEGIST | Executive Insurance BNCA

### html/pricing1.html
**Score:** 94  **Title:** TSMatter · Pricing
**Vertical:** healthcare, construction, bpo, real estate, insurance, legal, tax
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** Intelligence priced for how you operate | BPO document intelligence — add-on | Your branded portal is already live

### html/property-accountant/property-accountant-command.html
**Score:** 94  **Title:** TSM Property Accountant Command
**Vertical:** mortgage, insurance, tax, property, vendor, approval
**Signals:** actions=3, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** Property Accountant Command | Accounting Exception Queue | Month-End Close Workflow

### html/war-rooms/business-development/tsm-outreach-command-center.html
**Score:** 94  **Title:** TSM Outreach Command Center
**Vertical:** healthcare, construction, bpo, mortgage, real estate
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** 90 Day Mission | Pipeline Health | This Week | Outreach Pipeline | Add Prospect | Daily Outreach Mission | Priority Partner Channels | Partner Introduction Template

### html/war-rooms/tsm-wip-command-center.html
**Score:** 94  **Title:** TSM SHELL · Execution &amp; WIP Command Center
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** Execution &amp; WIP Command Center

### html/concierge-demo-presentation.html
**Score:** 93  **Title:** TSM &middot; Concierge &middot; Demo Presentation
**Vertical:** healthcare, construction, hotel, hotelops
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** HOW-TO, EXECUTION, BUSINESS-VALUE
**Headings:** One guest issue. SHA-256-signed relay. Twelve operations tabs. | The full Concierge command surface | How a guest issue becomes an executive-ready brief | What's live today &mdash; and what's still roadmap | See the relay chain live

### html/ep1.html
**Score:** 92  **Title:** TSM Executive Portal v2
**Vertical:** healthcare, construction, insurance, finops
**Signals:** actions=5, report-actions=1
**Likely guidance gaps:** HOW-TO, START, EXECUTION

### html/finops-suite/copilot.html
**Score:** 92  **Title:** TSM FinOps · Staff Accountant Copilot
**Vertical:** finops, tax, vendor
**Signals:** actions=7, report-actions=0
**Likely guidance gaps:** BUSINESS-VALUE
**Headings:** TSM FINOPS · STAFF ACCOUNTANT COPILOT | Active Workflows | AR Risk Exposure | Close Readiness | Connected Nodes | START HERE · WHAT ARE YOU WORKING ON? | HOW THIS HELPS STAFF ACCOUNTANTS | COPILOT OUTPUT

### html/war-rooms/digital-twin/digital-twin.html
**Score:** 92  **Title:** TSM Enterprise Digital Twin
**Signals:** actions=3, report-actions=1
**Likely guidance gaps:** HOW-TO, START, EXECUTION

### html/war-rooms/integration-hub/integration-hub.html
**Score:** 92  **Title:** TSM Integration Hub
**Vertical:** catalog
**Signals:** actions=4, report-actions=0
**Likely guidance gaps:** HOW-TO, START, EXECUTION, BUSINESS-VALUE

### html/finops-suite/doc-analysis-tab1.html
**Score:** 90  **Title:** TSM FinOps Intelligence · Document Processor
**Vertical:** legal, finops, finance, tax, vendor
**Signals:** actions=8, report-actions=3
**Likely guidance gaps:** HOW-TO, DECISION

### html/hotelops/hotelops-executive-portal.html
**Score:** 90  **Title:** GID &middot; HotelOps Executive Portal
**Vertical:** hotel, hotelops
**Signals:** actions=3, report-actions=4
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/l1-copilot/noc/noc-war-room.html
**Score:** 90  **Title:** TSM NOC Command Center
**Vertical:** noc
**Signals:** actions=8, report-actions=0
**Likely guidance gaps:** HOW-TO, EXECUTION, BUSINESS-VALUE

### html/tsm-collective-bnca.html
**Score:** 90  **Title:** TSM Neural Core — Collective BNCA
**Vertical:** healthcare, construction, bpo, real estate, insurance, legal, finops
**Signals:** actions=4, report-actions=0
**Likely guidance gaps:** HOW-TO, EXECUTION, BUSINESS-VALUE

### html/tsm-insurance/ins-tax.html
**Score:** 90  **Title:** TSM · Insurance Tax Prep · Agent Intelligence
**Vertical:** healthcare, insurance, legal, tax, crm
**Signals:** actions=6, report-actions=1
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** Insurance Tax Prep Agent Command | Agent Tax Analyzer | Key Tax Numbers | Agent Deduction Categories | Agent 1099 Checklist | ACA Client Credit Calculator

### html/war-rooms/honeywell-executive-portal.html
**Score:** 90  **Title:** TSM · Honeywell Executive
**Vertical:** mortgage, hotel, hotelops, supplier
**Signals:** actions=3, report-actions=4
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO ESCALATION RECEIVED

### html/war-rooms/mortgage/mortgage-executive-portal.html
**Score:** 90  **Title:** TSM &middot; Mortgage Command Center Executive Portal
**Vertical:** mortgage
**Signals:** actions=4, report-actions=4
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/o2c/o2c-war-room.html
**Score:** 90  **Title:** TSM Order-to-Cash War Room
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, EXECUTION, BUSINESS-VALUE

### html/war-rooms/schools-command/schools-executive-portal.html
**Score:** 90  **Title:** TSM &middot; Schools Command Center Executive Portal
**Vertical:** schools
**Signals:** actions=3, report-actions=4
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/demo/tsm-demo-console.html
**Score:** 88  **Title:** TSM Consultz — Live Relay Console
**Signals:** actions=2, report-actions=1
**Likely guidance gaps:** HOW-TO, OUTPUT
**Headings:** TSM Consultz

### html/desert-pitch.html
**Score:** 87  **Title:** TSM × Desert Financial — Strategic Partnership Proposal
**Vertical:** healthcare, construction, mortgage, real estate, insurance, legal, finance, tax
**Signals:** actions=2, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE

### html/finops-suite/rcm-os-presentation.html
**Score:** 87  **Title:** TSM &middot; RCM OS &middot; Demo Presentation
**Vertical:** logistics, finops, vendor
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** One cadence for close. Nine modules. Zero blind spots. | Every module RCM OS sequences and watches | How a thin current ratio becomes an executive exception | What the Working Capital Worksheet watches | See it live in RCM OS

### html/shared/tsm-ai-wiring-guide.html
**Score:** 87  **Title:** TSMatter · AI Engine Wiring Guide
**Vertical:** healthcare, construction, mortgage, insurance, legal, schools, tax, vendor
**Signals:** actions=2, report-actions=0
**Likely guidance gaps:** BUSINESS-VALUE
**Headings:** TSMatter AI Engine · Wiring Guide | Step 1 — Place the engine on your server | Step 2 — Add one script tag to each app | Step 3 — Initialize for the right company + node | App → Profile → Node map | Core methods — quick reference | Wiring patterns — 3 ways to wire any existing app | Pattern A — TSMai.wire() — attach to existing buttons, zero HTML changes

### html/tsm-pitch.html
**Score:** 87  **Title:** TSM — Total Solution Management
**Vertical:** healthcare, construction, bpo, insurance, finops, supplier
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** BUSINESS-VALUE
**Headings:** What takes BPOs days takes TSM minutes. | Your team is doing 3-day work that should take 20 minutes. | Built for three types of Phoenix operators. | How to run a 15-minute meeting. | Open any of these right now.

### html/tsm-staffing-readiness-demo.html
**Score:** 87  **Title:** TSM — Staffing Readiness Command Center
**Vertical:** healthcare, construction, insurance, finops
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO
**Headings:** Place job-ready candidates. Zero prep gaps.

### html/war-rooms/honeywell-strategist.html
**Score:** 87  **Title:** TSM · Honeywell Strategist
**Vertical:** supplier
**Signals:** actions=4, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO ANALYSIS RECEIVED

### html/war-rooms/music-war/release/marketing.html
**Score:** 87  **Title:** ZY Music Command — AI Songwriting Decision Engine
**Vertical:** catalog
**Signals:** actions=5, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** Write once. Let it evolve. | Music Command Center | Stop guessing if the song is actually good. | Cadence + Bounce | Emotion + Imagery | Structure + Hook | Iterate Again | AI that helps you decide — not just generate.

### html/healthcare/hc-academy/hc-anomaly-advisor.html
**Score:** 85  **Title:** Anomaly Advisor · Full Report · TSM Healthcare
**Vertical:** healthcare
**Signals:** actions=4, report-actions=2
**Likely guidance gaps:** HOW-TO, EXECUTION

### html/tsm-hub-index.html
**Score:** 85  **Title:** TSM Hub
**Vertical:** construction, insurance, legal, finops
**Signals:** actions=6, report-actions=0
**Likely guidance gaps:** HOW-TO, EXECUTION

### html/war-rooms/music-war/release/release-center.html
**Score:** 85  **Title:** Release Center · Sweet Music™ OS
**Vertical:** legal
**Signals:** actions=6, report-actions=1
**Likely guidance gaps:** HOW-TO
**Headings:** Release Center | AUDIO & FILES | METADATA & RIGHTS | CREDITS & REGISTRATIONS | MARKETING PREP | RELEASE DETAILS | // AI-GENERATED PRESS BIO + PLAYLIST PITCH

### html/bpo-files/bpo-internal1.html
**Score:** 84  **Title:** TSM BPO — Sector Workflow Hub
**Vertical:** healthcare, construction, bpo, mortgage, insurance, legal, schools, hotel, hotelops, finops, tax, property
**Signals:** actions=6, report-actions=2
**Likely guidance gaps:** HOW-TO

### html/concierge-command.html
**Score:** 84  **Title:** TSM | Concierge Command
**Vertical:** hotel, hotelops, tax
**Signals:** actions=6, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** " + data.report_title + "

### html/reo-pro/mortgage/index.html
**Score:** 84  **Title:** TSM | Mortgage Command
**Vertical:** bpo, mortgage, tax
**Signals:** actions=6, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** " + data.report_title + "

### html/l1-copilot/noc/noc-strategist.html
**Score:** 83  **Title:** TSM &middot; NOC Command Center Strategist
**Vertical:** noc
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/approval-war-room.html
**Score:** 82  **Title:** TSM Enterprise Approval Center
**Vertical:** healthcare, approval
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, START, EXECUTION, BUSINESS-VALUE

### html/catalog-war-room.html
**Score:** 82  **Title:** TSM Product Catalog War Room
**Vertical:** catalog, cpq
**Signals:** actions=4, report-actions=0
**Likely guidance gaps:** HOW-TO, START, EXECUTION, BUSINESS-VALUE

### html/construction-suite/wip-billing/index.html
**Score:** 82  **Title:** Construction WIP + Billing
**Vertical:** construction
**Signals:** actions=5, report-actions=2
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** Construction WIP + Billing | Unified Sector WIP Queue | Strategist Output

### html/cpq-war-room.html
**Score:** 82  **Title:** TSM CPQ War Room
**Vertical:** cpq
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, START, EXECUTION, BUSINESS-VALUE

### html/finops-suite/wip-billing/index.html
**Score:** 82  **Title:** TSM · FinOps WIP + Billing Intelligence
**Vertical:** construction, finops
**Signals:** actions=5, report-actions=2
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** Construction WIP + Billing | Unified Sector WIP Queue | Strategist Output

### html/tsm-insurance/wip-billing/index.html
**Score:** 82  **Title:** TSM · Insurance Premium Audit + Claims WIP
**Vertical:** construction, insurance
**Signals:** actions=5, report-actions=2
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** Construction WIP + Billing | Unified Sector WIP Queue | Strategist Output

### html/war-rooms/approval/approval-war-room.html
**Score:** 82  **Title:** TSM Enterprise Approval Center
**Vertical:** healthcare, approval
**Signals:** actions=6, report-actions=0
**Likely guidance gaps:** HOW-TO, START, EXECUTION, BUSINESS-VALUE

### html/war-rooms/catalog/catalog-war-room.html
**Score:** 82  **Title:** TSM Product Catalog War Room
**Vertical:** catalog, cpq
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, START, EXECUTION, BUSINESS-VALUE

### html/war-rooms/cpq/cpq-war-room.html
**Score:** 82  **Title:** TSM CPQ War Room
**Vertical:** catalog, cpq
**Signals:** actions=6, report-actions=0
**Likely guidance gaps:** HOW-TO, START, EXECUTION, BUSINESS-VALUE

### html/war-rooms/crm/crm-war-room.html
**Score:** 82  **Title:** TSM CRM War Room
**Vertical:** crm
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, START, EXECUTION, BUSINESS-VALUE

### html/concierge/concierge-strategist.html
**Score:** 80  **Title:** TSM · Concierge Transport Strategist
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, EXECUTION, BUSINESS-VALUE

### html/construction.html
**Score:** 80  **Title:** Construction Operations Intelligence
**Vertical:** construction, insurance, legal, logistics, finance, itops, vendor
**Signals:** actions=6, report-actions=2
**Likely guidance gaps:** DECISION

### html/healthcare/suite-index.html
**Score:** 80  **Title:** TSM · Healthcare Suite
**Vertical:** healthcare, insurance, legal, finops, tax, vendor
**Signals:** actions=7, report-actions=0
**Likely guidance gaps:** START, EXECUTION, BUSINESS-VALUE
**Headings:** ${tab}

### html/tsm-insurance/agents-ins.html
**Score:** 80  **Title:** TSM Insurance Core - Broker & Agent Sync
**Vertical:** construction, insurance, legal
**Signals:** actions=4, report-actions=0
**Likely guidance gaps:** HOW-TO, DECISION, BUSINESS-VALUE
**Headings:** 📚 Persistent Playbook Workspace Library | Agent Command Center

### html/construction-suite/showcase/index.html
**Score:** 78  **Title:** 🏗️ CONSTRUCTION COMMAND CENTER
**Vertical:** construction
**Signals:** actions=1, report-actions=2
**Likely guidance gaps:** HOW-TO, EXECUTION
**Headings:** PROJECT ASSETS

### html/demo-launcher.html
**Score:** 78  **Title:** TSM · Demo Launcher
**Vertical:** healthcare, construction, real estate, insurance, hotel, hotelops, finops
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** EXECUTION
**Headings:** Demo Launcher

### html/doc-search.html
**Score:** 78  **Title:** TSM Universal Intake · Document Router
**Vertical:** healthcare, construction, bpo, insurance, legal, finops
**Signals:** actions=8, report-actions=2
**Likely guidance gaps:** HOW-TO, DECISION

### html/sentinel-business-lab-demo.html
**Score:** 78  **Title:** TSM Sentinel — Business Simulation Lab
**Signals:** actions=6, report-actions=3
**Likely guidance gaps:** HOW-TO, DECISION
**Headings:** —

### html/war-rooms/music-war/academy/daw-academy.html
**Score:** 76  **Title:** DAW Academy · Sweet Music™ OS
**Signals:** actions=4, report-actions=1
**Headings:** DAW Academy | FL Studio | Logic Pro | Ableton Live | Reaper | GarageBand | Pro Tools | 🤖 ASK THE DAW COACH

### html/war-rooms/music-war/index.html
**Score:** 76  **Title:** Sweet Music™ OS — TSM Music Command
**Signals:** actions=1, report-actions=1
**Likely guidance gaps:** HOW-TO, EXECUTION
**Headings:** Idea → Release . AI at every step. | Song Builder | Beat Workbench | Cadence Studio | Producer AI | Recording Coach | Mix Coach | Master Coach

### html/hotelops/hotelops-strategist.html
**Score:** 75  **Title:** GID &middot; HotelOps Strategist
**Vertical:** hotel, hotelops
**Signals:** actions=4, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/logistics/logistics-executive-portal.html
**Score:** 75  **Title:** TSM &middot; Logistics Executive Portal
**Vertical:** logistics
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/logistics/logistics-strategist-v2.html
**Score:** 75  **Title:** TSM &middot; Logistics Strategist
**Vertical:** logistics
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/sap_phases_talktrack_section_v2.html
**Score:** 75  **Title:** Untitled
**Vertical:** bpo, supplier, vendor, crm, catalog, cpq, approval
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** HOW-TO, EXECUTION, BUSINESS-VALUE
**Headings:** THE ENTERPRISE BACKBONE: BEYOND THE VERTICALS | ORDER-TO-CASH (O2C) | CRM | CPQ (CONFIGURE, PRICE, QUOTE) | PRODUCT CATALOG | ENTERPRISE APPROVAL CENTER | MASTER DATA MANAGEMENT (MDM) | GOVERNANCE &amp; COMPLIANCE

### html/supplier-vendor/supplier-vendor-executive-portal.html
**Score:** 75  **Title:** TSM &middot; Supplier/Vendor Executive Portal
**Vertical:** supplier, vendor
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/supplier-vendor/supplier-vendor-strategist-v2.html
**Score:** 75  **Title:** TSM &middot; Supplier/Vendor Strategist
**Vertical:** supplier, vendor
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/tsm-consultz-landing-page.html
**Score:** 75  **Title:** TSM — Intelligence Runtime Platform
**Vertical:** healthcare, construction, bpo, real estate, insurance, legal, finops, finance, crm, catalog, cpq, approval
**Signals:** actions=1, report-actions=0
**Likely guidance gaps:** HOW-TO, EXECUTION, BUSINESS-VALUE
**Headings:** Every decision your business makes, on the record. | We don't manage workflows. We instrument them. | Three layers, shared across every part of your business | Event bus | Governance layer | AI decision intelligence | One runtime, ten operational war rooms | Nothing happens off the record

### html/war-rooms/approval/approval-executive-portal.html
**Score:** 75  **Title:** TSM &middot; Approval Chain Executive Portal
**Vertical:** approval
**Signals:** actions=4, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/approval/approval-strategist.html
**Score:** 75  **Title:** TSM &middot; Approval Chain Strategist
**Vertical:** approval
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/catalog/catalog-executive-portal.html
**Score:** 75  **Title:** TSM &middot; Product Catalog Executive Portal
**Vertical:** catalog
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/catalog/catalog-strategist.html
**Score:** 75  **Title:** TSM &middot; Product Catalog Strategist
**Vertical:** catalog
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/cpq/cpq-executive-portal.html
**Score:** 75  **Title:** TSM &middot; Configure Price Quote Executive Portal
**Vertical:** cpq
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/cpq/cpq-strategist.html
**Score:** 75  **Title:** TSM &middot; Configure Price Quote Strategist
**Vertical:** cpq
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/crm/crm-executive-portal.html
**Score:** 75  **Title:** TSM &middot; Customer Relationship Mgmt Executive Portal
**Vertical:** crm
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/crm/crm-strategist.html
**Score:** 75  **Title:** TSM &middot; Customer Relationship Mgmt Strategist
**Vertical:** crm
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/digital-twin/digital-twin-executive-portal.html
**Score:** 75  **Title:** TSM &middot; Digital Twin Executive Portal
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/digital-twin/digital-twin-strategist.html
**Score:** 75  **Title:** TSM &middot; Digital Twin Strategist
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/integration-hub/integration-hub-executive-portal.html
**Score:** 75  **Title:** TSM &middot; Integration Hub Executive Portal
**Signals:** actions=4, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/integration-hub/integration-hub-strategist.html
**Score:** 75  **Title:** TSM &middot; Integration Hub Strategist
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/mdm/mdm-executive-portal.html
**Score:** 75  **Title:** TSM &middot; Master Data Management Executive Portal
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/mortgage/mortgage-strategist.html
**Score:** 75  **Title:** TSM &middot; Mortgage Command Center Strategist
**Vertical:** mortgage
**Signals:** actions=4, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/music-war/creation/beat-workbench.html
**Score:** 75  **Title:** Beat Workbench · Sweet Music™ OS
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, EXECUTION
**Headings:** Beat Intelligence Engine | // SUGGESTED VOCAL STYLES | // RECOMMENDED STRUCTURE | // PRODUCER NOTES — TSM NEURAL CORE

### html/war-rooms/music-war/creation/song-builder.html
**Score:** 75  **Title:** Song Builder · Sweet Music™ OS
**Signals:** actions=7, report-actions=0
**Likely guidance gaps:** HOW-TO, EXECUTION
**Headings:** Song Builder Wizard | STEP 01 · Genre | STEP 02 · Mood | STEP 03 · Sound Inspiration | STEP 04 · Song Message | STEP 05 · Hook Concept | STEP 06 · Beat Context | STEP 07 · Song Structure

### html/war-rooms/o2c/o2c-executive-portal.html
**Score:** 75  **Title:** TSM &middot; Order to Cash Executive Portal
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/o2c/o2c-strategist.html
**Score:** 75  **Title:** TSM &middot; Order to Cash Strategist
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/war-rooms/schools-command/schools-strategist.html
**Score:** 75  **Title:** TSM &middot; Schools Command Center Strategist
**Vertical:** schools
**Signals:** actions=3, report-actions=3
**Likely guidance gaps:** HOW-TO, START, EXECUTION
**Headings:** NO DATA RECEIVED

### html/shared/tsm-mission-queue.html
**Score:** 74  **Title:** TSM Mission Queue — Cross-Sector Exception Operations
**Signals:** actions=3, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE
**Headings:** TSM Mission Queue

### html/tsm-operational-os-executive.html
**Score:** 74  **Title:** TSM Operational OS · Executive Command Center
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, START, BUSINESS-VALUE
**Headings:** Executive Recovery Command Center | Vertical Recovery | Escalations | Recommended Actions | Evidence Coverage | Recovery Package JSON

### html/tsm-workforce-intelligence-command-center.html
**Score:** 74  **Title:** TSM Workforce Intelligence & Operations Command Center
**Vertical:** healthcare, insurance, legal
**Signals:** actions=4, report-actions=0
**Likely guidance gaps:** HOW-TO, START, EXECUTION, BUSINESS-VALUE
**Headings:** TSM ECOSYSTEM OS | Workforce Intelligence Platform | Workforce Readiness & Talent Simulation Platform | Candidate Readiness Verification Summary | Randstad Deployment Mode | Review Staffing Deployment Use Cases

### html/bpo-files/bpo-supervisor.html
**Score:** 72  **Title:** BPO Supervisor Roster
**Vertical:** bpo
**Signals:** actions=4, report-actions=0
**Likely guidance gaps:** HOW-TO, BUSINESS-VALUE

### html/finops-suite/rcm-os-simulation.html
**Score:** 72  **Title:** RCM-OS Simulation Lab
**Vertical:** insurance, finops, tax
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, DECISION, BUSINESS-VALUE
**Headings:** RCM-OS Simulation Lab | 1. Select Simulation Scenario | 2. Reconciliation Result | 3. RCM-OS Event Stream | 4. Remediation Test

### html/healthcare/hc-academy/crc-hc-exam.html
**Score:** 72  **Title:** TSM · Staff Accountant + CRCR Command
**Vertical:** healthcare, finops, finance
**Signals:** actions=7, report-actions=0
**Likely guidance gaps:** DECISION, BUSINESS-VALUE

### html/healthcare/hc-academy/crc-hc-practice.html
**Score:** 72  **Title:** TSM · Staff Accountant + CRCR Command
**Vertical:** healthcare, finops, finance
**Signals:** actions=7, report-actions=0
**Likely guidance gaps:** DECISION, BUSINESS-VALUE

### html/reo-pro/pack-index.html
**Score:** 72  **Title:** TSM Mortgage Rescue Pack Library
**Vertical:** mortgage
**Signals:** actions=5, report-actions=1
**Likely guidance gaps:** HOW-TO, START, DECISION, OUTPUT
**Headings:** ⚡ MORTGAGE RESCUE PACK LIBRARY

### html/tsm-insurance/ahip.html
**Score:** 70  **Title:** AHIP Certification Prep · TSM
**Vertical:** healthcare, insurance, legal, tax
**Signals:** actions=5, report-actions=0
**Likely guidance gaps:** HOW-TO, DECISION, BUSINESS-VALUE

## P1 — High-Value Enhancement Candidates

- **69** `html/tsm-app-rationalizer.html` — TSM Shell · Portfolio Rationalizer
  - Gaps: HOW-TO, START
- **68** `html/candidate-intake.html` — TSM Healthcare Intelligence Academy
  - Gaps: HOW-TO, BUSINESS-VALUE
- **68** `html/healthcare/hc-academy/hc-academy.html` — TSM Healthcare Intelligence Academy
  - Gaps: HOW-TO, BUSINESS-VALUE
- **66** `html/client-portal.html` — TSM Client Portal
  - Gaps: HOW-TO
- **66** `html/construction-suite/tax-prep.html` — Construction Tax Prep
  - Gaps: HOW-TO, START, BUSINESS-VALUE
- **65** `html/bpo-files/suite-hub.html` — TSM Suite Hub
  - Gaps: HOW-TO, START, EXECUTION, BUSINESS-VALUE
- **65** `html/concierge/concierge-war-room.html` — TSM · Concierge Transport War Room
  - Gaps: HOW-TO, EXECUTION
- **65** `html/finops-suite/working-capital-calculator.html` — Working Capital Worksheet · TSM RCM OS
  - Gaps: HOW-TO, DECISION, BUSINESS-VALUE
- **65** `html/l1-copilot/servicenow-exam-sim.html` — ServiceNow Timed Exam Sim · TSM Career Training
  - Gaps: HOW-TO, START, DECISION, OUTPUT
- **65** `html/legal-pro/legal-scenarios.html` — Legal Scenarios · TSM Legal-Pro
  - Gaps: HOW-TO, EXECUTION
- **65** `html/mission-executive-dashboard.html` — TSM Enterprise Mission Dashboard
  - Gaps: HOW-TO, DECISION, BUSINESS-VALUE
- **65** `html/war-rooms/honeywell-howto.html` — TSM | Honeywell — How-To Guide
  - Gaps: EXECUTION, BUSINESS-VALUE
- **64** `html/dme.html` — Medicare DME Benefits — What Medicare Pays For | TSM Matter
  - Gaps: HOW-TO, START, BUSINESS-VALUE
- **64** `html/dme/index.html` — Medicare DME Benefits — What Medicare Pays For | TSM Matter
  - Gaps: HOW-TO, START, BUSINESS-VALUE
- **64** `html/doc1-search.html` — TSM Document Search
  - Gaps: HOW-TO, START, BUSINESS-VALUE
- **64** `html/tsm-insurance/dme.html` — Medicare DME Benefits — What Medicare Pays For | TSM Matter
  - Gaps: HOW-TO, START, BUSINESS-VALUE
- **64** `html/tsm-insurance/insurance-ce-command.html` — TSM Insurance · CE Command
  - Gaps: HOW-TO, START, EXECUTION, BUSINESS-VALUE
- **62** `html/tsm-insurance/ce-study-prep.html` — TSM CE Study Prep — Insurance Exam Preparation
  - Gaps: HOW-TO, DECISION, BUSINESS-VALUE
- **60** `html/finops-suite/crcr-study-mode.html` — TSM · CRCR Study Mode · Healthcare Revenue Cycle
  - Gaps: HOW-TO, BUSINESS-VALUE
- **60** `html/healthcare/hc-academy/tsm-hc-demo-trail.html` — TSM Healthcare · PoC Demo Trail
  - Gaps: HOW-TO, BUSINESS-VALUE
- **60** `html/l1-copilot/aplus/aplus-pbq.html` — A+ PBQ Simulation · TSM Career Training
  - Gaps: HOW-TO, START, DECISION, BUSINESS-VALUE
- **60** `html/l1-copilot/aplus/aplus-practice.html` — A+ Question Coach · TSM Career Training
  - Gaps: HOW-TO, START, DECISION, BUSINESS-VALUE
- **57** `html/l1-copilot/topology.html` — Untitled
  - Gaps: HOW-TO, START
- **57** `html/war-rooms/music-war/demo-conductor.html` — TSM ZY Music Suite · Demo Conductor
- **55** `html/demo/inphusionsys-hub.html` — InphusionSys — Multi-Vertical Demo Console
  - Gaps: HOW-TO, DECISION
- **55** `html/enterprise/enterprise-executive-portal.html` — TSM &middot; Enterprise Executive Decision Portal
  - Gaps: HOW-TO, EXECUTION
- **53** `html/war-rooms/music-war/analytics.html` — Analytics · Sweet Music™ OS
  - Gaps: HOW-TO, START, OUTPUT
- **50** `html/war-rooms/music-war/academy/music-business.html` — Music Business Basics · Sweet Music™ OS
  - Gaps: HOW-TO, START, BUSINESS-VALUE
- **50** `html/war-rooms/music-war/producer/mixing-coach.html` — Mixing Coach · Sweet Music™ OS
  - Gaps: HOW-TO, START, BUSINESS-VALUE

## Report-Producing Workflows

- `html/TSM_Shell_Honeywell_TalkTrack_30min.html` — brief, export, package, report, summary
- `html/appointments/index.html` — brief, export, report, summary
- `html/auditops-pro.html` — csv, download, export, generate, pdf, report, xlsx
- `html/az-ins.tsmatter.html` — export, generate, pdf, report, summary
- `html/az-ins/index.html` — brief, export, generate, pdf, report, summary
- `html/az-life/index.html` — csv, download, export, generate, pdf, report, summary, xlsx
- `html/banner-health-demo.html` — brief, export, generate, package, presentation, report, summary
- `html/bnca-gtm-hc.html` — generate, presentation, report, snapshot
- `html/bpo-files/tsm-staffing-intelligence.html` — export, generate, pdf, report
- `html/bpo-legal.tsmatter.html` — export, generate, pdf, report, summary
- `html/bpo-realty.tsmatter.html` — export, generate, pdf, report, summary
- `html/bpo-tax.tsmatter.html` — export, generate, pdf, report, summary
- `html/case-tech.tsmatter.html` — export, generate, pdf, report, summary
- `html/client-access.html` — brief, report, summary
- `html/compliance.html` — csv, export, generate, pdf, report, summary, xlsx
- `html/compliance/index.html` — report, summary
- `html/construction-center.html` — brief, csv, generate, package, pdf, report, summary
- `html/construction-command.tsmatter.html` — export, generate, pdf, report, summary
- `html/construction-demo-presentation.html` — brief, presentation, proposal
- `html/construction-suite/auditops-tax.html` — csv, download, export, generate, pdf, report, xlsx
- `html/construction-suite/compliance-hub.html` — export, generate, pdf, report, summary
- `html/construction-suite/compliance.html` — export, generate, pdf, report, summary
- `html/construction-suite/construct-pitch.html` — export, generate, package, report, summary
- `html/construction-suite/construction-command-pro.html` — brief, csv, generate, package, pdf, report, summary
- `html/construction-suite/construction-command.html` — brief, csv, generate, package, pdf, report, summary
- `html/construction-suite/construction-hub.html` — brief, export, generate, pdf, report, summary
- `html/construction-suite/construction-pro.html` — export, report, summary
- `html/construction-suite/construction-scenarios.html` — brief, export, generate, package, pdf, report, summary, xlsx
- `html/construction-suite/construction-showcase-v2.html` — brief, csv, export, generate, generate report, package, pdf, report, summary, xlsx
- `html/construction-suite/construction-suite-expansion.html` — csv, export, generate, pdf, report, summary
- `html/construction-suite/construction-wip.html` — brief, export, generate, package, summary
- `html/construction-suite/contruction-pro.html` — export, report, summary
- `html/construction-suite/doc-showcase2.html` — pdf, report, summary, xlsx
- `html/construction-suite/document-showcase.html` — csv, export, pdf, report, summary, xlsx
- `html/construction-suite/financial.html` — generate, generate report, report, summary
- `html/construction-suite/financial/index.html` — export, generate, pdf, report, summary
- `html/construction-suite/how-to.html` — brief, csv, export, package, pdf, report, summary, xlsx
- `html/construction-suite/index.html` — export, generate, pdf, report, summary
- `html/construction-suite/legal.html` — export, generate, pdf, report, summary
- `html/construction-suite/permits-proposals.html` — generate, pdf, proposal, report
- `html/construction-suite/tsm-construction-command.html` — brief, export, generate, package, pdf, report, summary
- `html/construction-suite/tsm-construction-pitch.html` — generate, report
- `html/construction-suite/zero-trust.html` — csv, export, generate, generate report, package, report
- `html/construction-wip.html` — brief, export, generate, package
- `html/cyber-incident.html` — export, generate, package, report
- `html/demo/presentation-hub.html` — brief, download, presentation, proposal
- `html/demo/presentations/career-demo-presentation.html` — generate, package, presentation, report
- `html/desert-financial.tsmatter.html` — export, generate, pdf, report, summary
- `html/financial-command.html` — export, generate, pdf, report, summary
- `html/financial-command.tsmatter.html` — export, generate, pdf, report, summary
- `html/financial.html` — generate, generate report, report, summary
- `html/finops-accounting.html` — export, report
- `html/finops-command-suite-v2.html` — brief, csv, generate, pdf, report, summary
- `html/finops-main-strategist.html` — csv, export, generate, pdf, report, snapshot, summary, xlsx
- `html/finops-main-strategist1.html` — export, package, pdf, report
- `html/finops-suite/compliance.html` — csv, export, generate, pdf, report, summary, xlsx
- `html/finops-suite/doc-analysis-tab.html` — report
- `html/finops-suite/financial-ui.html` — brief, export, generate, package, pdf, presentation, report, snapshot, summary
- `html/finops-suite/finops-accounting.html` — export, report
- `html/finops-suite/finops-main-strategist/index.html` — brief, csv, export, generate, pdf, report, snapshot, summary, xlsx
- `html/finops-suite/finops-main-strategist/index1.html` — export, package, pdf, report
- `html/finops-suite/finops-main-strategist/main-strategist.html` — generate, report
- `html/finops-suite/finops-main-strategist/manager-bar-patch.html` — brief, export, generate, pdf, report
- `html/finops-suite/finops-operations.html` — csv, export, generate, generate report, pdf, report, summary, xlsx
- `html/finops-suite/finops-presentation.html` — brief, export, generate, report, summary
- `html/finops-suite/finops-presentation/index.html` — brief, export, generate, report, summary
- `html/finops-suite/finops-scenarios.html` — brief, csv, export, generate, package, presentation, report, summary
- `html/finops-suite/finops-showcase-v1.html` — csv, export, pdf, report, xlsx
- `html/finops-suite/finops-showcase-v2.html` — brief, csv, export, generate, generate report, package, pdf, report, summary, xlsx
- `html/finops-suite/finops-showcase/index.html` — csv, pdf, report, summary
- `html/finops-suite/finops-war/finops-executive-portal.html` — brief, export, generate, package
- `html/finops-suite/finops-war/finops-main-strategist.html` — csv, export, generate, pdf, report, snapshot, summary, xlsx
- `html/finops-suite/finops-war/finops-war-room.html` — export, generate, package, pdf, snapshot
- `html/finops-suite/how-to-finops-updated.html` — export, generate, presentation, report
- `html/finops-suite/how-to-finops.html` — brief, csv, download, export, generate, package, pdf, presentation, report, snapshot
- `html/finops-suite/how-to.html` — brief, csv, export, generate, package, pdf, report, summary, xlsx
- `html/finops-suite/index-elevated.html` — generate, generate report, report, summary
- `html/finops-suite/staff-accountant-interview.html` — csv, export, generate, package, pdf, report, summary
- `html/finops-suite/study-guide.html` — brief, generate, package, report
- `html/finops-suite/tax.html` — csv, download, export, generate, pdf, report, xlsx
- `html/finops-suite/tsm-finops-pitch.html` — brief, export, generate, pdf, report, summary
- `html/finops-suite/tsm-presentation.html` — brief, csv, export, generate, presentation, report, summary
- `html/finops-suite/tsm-rcm-os-howto.html` — brief, download, export, generate, generate report, package, pdf, report, snapshot, summary
- `html/finops-suite/tsm-rcm-os.html` — brief, export, presentation, report, summary
- `html/finops-suite/wip/index.html` — brief, export, summary
- `html/finops-suite/zero-trust.html` — csv, export, generate, generate report, package, report
- `html/ghs_onepager.html` — report
- `html/go-to-market.html` — generate, presentation, report, snapshot
- `html/hc-billing.tsmatter.html` — export, generate, pdf, report, summary
- `html/hc-compliance.tsmatter.html` — export, generate, pdf, report, summary
- `html/hc-demo-flow.html` — export, generate, presentation, report
- `html/hc-financial.tsmatter.html` — export, generate, pdf, report, summary
- `html/hc-grants.tsmatter.html` — export, generate, pdf, report, summary
- `html/hc-insurance.tsmatter.html` — export, generate, pdf, report, summary
- `html/hc-legal.tsmatter.html` — export, generate, pdf, report, summary
- `html/hc-medical.tsmatter.html` — export, generate, pdf, report, summary
- `html/hc-pharmacy.tsmatter.html` — export, generate, pdf, report, summary
- `html/hc-strategist.tsmatter.html` — export, generate, pdf, report, summary
- `html/hc-taxprep.tsmatter.html` — export, generate, pdf, report, summary
- `html/hc-vendors.tsmatter.html` — export, generate, pdf, report, summary
- `html/healthcare-demo-script.html` — export, generate, presentation
- `html/healthcare/executive-portal.html` — brief, export, generate, package, proposal, report
- `html/healthcare/hc-academy/crcc-scenarios.html` — brief, generate, package, report, summary
- `html/healthcare/hc-academy/crcr-scenarios.html` — brief, generate, package, report, summary
- `html/healthcare/hc-academy/poc-html/index.html` — csv, pdf, xlsx
- `html/healthcare/hc-billing/index.html` — brief, export, summary
- `html/healthcare/hc-compliance/index.html` — brief, export, generate, snapshot, summary
- `html/healthcare/hc-denial-war-room.html` — csv, export, generate, pdf, report, summary, xlsx
- `html/healthcare/hc-financial/index.html` — brief, export, generate, snapshot, summary
- `html/healthcare/hc-grants/index.html` — brief, generate, package, report, snapshot, summary
- `html/healthcare/hc-insurance/index.html` — export, snapshot, summary
- `html/healthcare/hc-legal/index.html` — brief, export, generate, snapshot, summary
- `html/healthcare/hc-main-strategist.html` — brief, generate, report
- `html/healthcare/hc-medical/index.html` — brief, export, generate, snapshot, summary
- `html/healthcare/hc-operations/index.html` — brief, export, generate, snapshot, summary
- `html/healthcare/hc-pharmacy/index.html` — brief, export, generate, snapshot, summary
- `html/healthcare/hc-strategist/index.html` — brief, export, generate, presentation, report, summary
- `html/healthcare/hc-taxprep/index.html` — brief, export, generate, snapshot, summary
- `html/healthcare/hc-vendors/index.html` — brief, export, generate, snapshot, summary
- `html/honorhealth-revenue-leak-snapshot.html` — brief, export, generate, package, report, snapshot
- `html/hotelops/hotelops-howto.html` — brief, export, snapshot, summary
- `html/hotelops/hotelops-war-room.html` — 
- `html/ins-presentation/index.html` — generate
- `html/inty-finops-offer/index.html` — generate, package, pdf, report
- `html/l1-copilot/enterprise-command-center.html` — generate, snapshot, summary
- `html/l1-copilot/l1-ticket-copilot.html` — generate, package, snapshot, summary
- `html/l1-copilot/tsm-itops-demo-presentation.html` — generate, package, summary
- `html/l1-copilot/vmware-copilot.html` — generate, snapshot
- `html/legal-main-strategist.html` — export, generate, package, report
- `html/legal-pro/case-strategist.html` — generate, package, summary
- `html/legal-pro/index.html` — brief, export, generate, pdf, report, summary
- `html/legal-pro/legal-account.html` — csv, export, generate, pdf, report, summary, xlsx
- `html/legal-pro/legal-tax.html` — csv, download, export, generate, pdf, report, xlsx
- `html/legal-pro/legal-trust.html` — csv, export, generate, generate report, package, report
- `html/logistics/logistics-situation-room.html` — brief, export, generate, summary
- `html/mortgage/index.html` — brief, generate, generate report, report, summary
- `html/pc-command.tsmatter.html` — export, generate, pdf, report, summary
- `html/pc-command/index.html` — brief, generate, package, report
- `html/plant-incident.html` — export, generate, package, report
- `html/reo-command.html` — brief, export, report
- `html/reo-pro.tsmatter.html` — export, generate, pdf, report, summary
- `html/reo-pro/index.html` — generate, generate report, pdf, report, summary
- `html/reo-pro/re-doc-search.html` — brief, csv, pdf, report, xlsx
- `html/reo-pro/re-guide.html` — brief, csv, export, generate, package, pdf, report, snapshot, summary, xlsx
- `html/rrd-command.tsmatter.html` — export, generate, pdf, report, summary
- `html/sentinel-center.html` — export, report, snapshot
- `html/sentinel-how-to.html` — download, export, generate, report, snapshot, summary
- `html/strategist-index.html` — report
- `html/strategist00.tsmatter.html` — export, generate, pdf, report, summary
- `html/suite-builder.html` — export, generate, package, pdf, presentation

## Pages That Need Business-Value Guidance

- `html/access.html` — compliance, cost, revenue, risk
- `html/agents-ins.html` — audit, compliance, cost, exposure, revenue, risk, sla
- `html/agents-ins/index.html` — audit, compliance, cost, exposure, revenue, risk, sla
- `html/construction-suite/property-accounting-revenue-cycle.html` — audit, compliance, cost, exception, revenue
- `html/dignity-exec-presentation.html` — audit, backlog, compliance, denial, exposure, performance, recovery, revenue, risk
- `html/hc-demo-presentation.html` — audit, compliance, denial, exception, exposure, recovery, revenue, risk, sla
- `html/inty-power-finops-presentation.html` — audit, compliance, cost, leakage, loss, opportunity, revenue
- `html/inty-power-finops-presentation/index.html` — audit, compliance, cost, leakage, loss, opportunity, revenue
- `html/legal-demo-presentation.html` — audit, compliance, exception, risk
- `html/legal-pro/legal-compliance.html` — compliance, exposure, risk
- `html/mortgage-demo-presentation.html` — exception
- `html/real-estate-demo-presentation.html` — compliance, exception, risk
- `html/suite-builder/index.html` — audit, compliance, cost, exposure, revenue, risk
- `html/tsm-ab-study-plan.html` — audit, compliance, cost, denial, exposure, revenue, risk, sla
- `html/tsm-demo-playbook.html` — audit, cost, denial, exposure, leakage, recovery, revenue, risk, sla
- `html/tsm-insurance/ins-appeals.html` — compliance, denial, recovery
- `html/tsm-insurance/ins-compliance.html` — audit, compliance, exposure, risk
- `html/tsm-insurance/ins-hub1.html` — compliance, denial, loss, revenue, risk
- `html/tsm-insurance/ins-presentation.html` — compliance, cost, denial, exposure, revenue, risk, waste
- `html/tsm-insurance/ins-underwriting.html` — compliance, loss, revenue, risk
- `html/tsm-insurance/pc-command.html` — audit, cost, exposure, loss, revenue, risk, savings, sla
- `html/tsm-insurance/tsm-demo-launcher.html` — audit, cost, denial, exposure, leakage, risk
- `html/tsm-insurance/tsm-insurance-suite-index.html` — audit, compliance, loss, performance, risk, sla
- `html/tsm-marketing-platform.html` — audit, compliance, cost, denial, exception, exposure, opportunity, performance, recovery, revenue, risk, sla
- `html/tsm-platform-hub.html` — revenue, risk
- `html/tsm-solutions.html` — compliance, cost, denial, exposure, performance, revenue, risk, savings, sla
- `html/war-rooms/bpo-war/bpo-demo-presentation.html` — exception, exposure, revenue, risk
- `html/war-rooms/mdm/mdm-strategist.html` — audit
- `html/war-rooms/mortgage/mortgage-war-room.html` — compliance, exception, risk, sla
- `html/war-rooms/pm-copilot/pm-command.html` — compliance, exposure, sla
- `html/bpo-service-delivery-system.html` — audit, backlog, compliance, denial, exception, exposure, recovery, risk
- `html/property-accountant-demo-presentation.html` — audit, compliance, exception, revenue
- `html/tsm-insurance/insurance-suite-index.html` — audit, compliance, exposure, performance, risk
- `html/concierge/concierge-executive-portal.html` — exception
- `html/construction-suite/presentation.html` — audit, compliance, cost, exposure, risk
- `html/ins-main-strategist/index.html` — exposure, revenue, risk
- `html/pricing1.html` — audit, compliance, cost, denial, exception, revenue, risk, sla
- `html/property-accountant/property-accountant-command.html` — exception
- `html/war-rooms/business-development/tsm-outreach-command-center.html` — compliance, denial, exception, leakage, revenue, sla
- `html/war-rooms/tsm-wip-command-center.html` — risk
- `html/concierge-demo-presentation.html` — compliance, exception, revenue
- `html/finops-suite/copilot.html` — audit, compliance, exposure, risk
- `html/war-rooms/integration-hub/integration-hub.html` — sla
- `html/l1-copilot/noc/noc-war-room.html` — sla
- `html/tsm-collective-bnca.html` — revenue, risk
- `html/war-rooms/o2c/o2c-war-room.html` — risk, sla
- `html/desert-pitch.html` — audit, compliance, cost, denial, exposure, recovery, revenue, risk, savings
- `html/finops-suite/rcm-os-presentation.html` — audit, compliance, cost, exception, exposure, revenue, risk
- `html/shared/tsm-ai-wiring-guide.html` — compliance, denial, revenue, risk
- `html/tsm-pitch.html` — compliance, denial, exposure, performance, revenue, risk
- `html/concierge-command.html` — audit, compliance, cost, opportunity, recovery, risk
- `html/reo-pro/mortgage/index.html` — audit, compliance, risk
- `html/approval-war-room.html` — risk, sla
- `html/catalog-war-room.html` — compliance, risk
- `html/cpq-war-room.html` — risk, sla
- `html/war-rooms/approval/approval-war-room.html` — risk, sla
- `html/war-rooms/catalog/catalog-war-room.html` — compliance, risk
- `html/war-rooms/cpq/cpq-war-room.html` — risk, sla
- `html/war-rooms/crm/crm-war-room.html` — risk, sla
- `html/concierge/concierge-strategist.html` — exception
- `html/healthcare/suite-index.html` — compliance, denial
- `html/tsm-insurance/agents-ins.html` — audit, exposure, risk
- `html/sap_phases_talktrack_section_v2.html` — audit, compliance, cost, opportunity, revenue, risk, sla
- `html/tsm-consultz-landing-page.html` — audit, compliance, risk, sla
- `html/shared/tsm-mission-queue.html` — exception, risk
- `html/tsm-operational-os-executive.html` — exposure, loss, recovery
- `html/tsm-workforce-intelligence-command-center.html` — audit, compliance, revenue, risk
- `html/bpo-files/bpo-supervisor.html` — audit, sla
- `html/finops-suite/rcm-os-simulation.html` — exception
- `html/healthcare/hc-academy/crc-hc-exam.html` — compliance, denial
- `html/healthcare/hc-academy/crc-hc-practice.html` — denial
- `html/tsm-insurance/ahip.html` — audit, compliance, cost, loss, waste
- `html/candidate-intake.html` — denial, exposure, performance, revenue
- `html/healthcare/hc-academy/hc-academy.html` — denial, exposure, performance, revenue
- `html/construction-suite/tax-prep.html` — compliance, exposure, leakage, risk, savings
- `html/bpo-files/suite-hub.html` — denial
- `html/finops-suite/working-capital-calculator.html` — compliance, exception, revenue
- `html/mission-executive-dashboard.html` — sla
- `html/war-rooms/honeywell-howto.html` — exposure, loss, revenue, risk
- `html/dme.html` — cost, recovery
- `html/dme/index.html` — cost, recovery
- `html/doc1-search.html` — compliance, exposure
- `html/tsm-insurance/dme.html` — cost, recovery
- `html/tsm-insurance/insurance-ce-command.html` — compliance, exposure
- `html/tsm-insurance/ce-study-prep.html` — compliance, sla
- `html/finops-suite/crcr-study-mode.html` — denial, revenue
- `html/healthcare/hc-academy/tsm-hc-demo-trail.html` — compliance, denial, revenue
- `html/l1-copilot/aplus/aplus-pbq.html` — performance
- `html/l1-copilot/aplus/aplus-practice.html` — waste
- `html/war-rooms/music-war/academy/music-business.html` — performance
- `html/war-rooms/music-war/producer/mixing-coach.html` — sla
- `html/healthcare/hc-academy/tsm_healthcare_academy.html` — denial, performance, revenue
- `html/tsm-insurance/tsm-ins-demo-trail.html` — audit, compliance, exposure, sla
- `html/construction-suite/construction-osha-exam-sim.html` — compliance
- `html/executive-portal-v2.html` — risk
- `html/demo/presentations/construction-presentation.html` — risk
- `html/demo/presentations/property-revenue-presentation.html` — revenue
- `html/demo/presentations/mortgage-presentation.html` — exception
- `html/demo/presentations/realestate-presentation.html` — compliance
- `html/tsm-insurance/suite-index.html` — compliance
- `html/demo/presentations/healthcare-presentation.html` — denial
- `html/demo/presentations/schools-presentation.html` — compliance

## Workflow Families

### healthcare

- `html/TSM_Shell_Honeywell_TalkTrack_30min.html` — score 100
- `html/access.html` — score 100
- `html/appointments/index.html` — score 100
- `html/az-ins/index.html` — score 100
- `html/az-life/index.html` — score 100

### construction

- `html/auditops-pro.html` — score 100
- `html/construction-center.html` — score 100
- `html/construction-command.tsmatter.html` — score 100
- `html/construction-suite/auditops-tax.html` — score 100
- `html/construction-suite/compliance-hub.html` — score 100

### insurance

- `html/agents-ins.html` — score 100
- `html/agents-ins/index.html` — score 100
- `html/az-ins.tsmatter.html` — score 100
- `html/compliance.html` — score 100
- `html/finops-suite/compliance.html` — score 100

### finops

- `html/finops-accounting.html` — score 100
- `html/finops-main-strategist.html` — score 100
- `html/finops-main-strategist1.html` — score 100
- `html/finops-suite/doc-analysis-tab.html` — score 100
- `html/finops-suite/finops-accounting.html` — score 100

### music-war

- `html/war-rooms/music-war/how-to-guide.html` — score 100
- `html/war-rooms/music-war/presentation-live.html` — score 95
- `html/war-rooms/music-war/release/marketing.html` — score 87
- `html/war-rooms/music-war/release/release-center.html` — score 85
- `html/war-rooms/music-war/academy/daw-academy.html` — score 76

### finance

- `html/case-tech.tsmatter.html` — score 100
- `html/desert-financial.tsmatter.html` — score 100
- `html/financial-command.html` — score 100
- `html/financial-command.tsmatter.html` — score 100
- `html/hc-billing.tsmatter.html` — score 100

### bpo

- `html/bpo-legal.tsmatter.html` — score 100
- `html/bpo-realty.tsmatter.html` — score 100
- `html/bpo-tax.tsmatter.html` — score 100
- `html/reo-pro/re-doc-search.html` — score 100
- `html/reo-pro/re-guide.html` — score 100

### mortgage

- `html/mortgage-demo-presentation.html` — score 100
- `html/real-estate-demo-presentation.html` — score 100
- `html/reo-command.html` — score 100
- `html/war-rooms/mortgage/mortgage-war-room.html` — score 100
- `html/property-accountant/property-accountant-command.html` — score 94

### legal

- `html/finops-suite/how-to.html` — score 100
- `html/hc-legal.tsmatter.html` — score 100
- `html/legal-main-strategist.html` — score 100
- `html/legal-pro/legal-account.html` — score 100
- `html/legal-pro/legal-compliance.html` — score 100

### logistics

- `html/finops-suite/finops-showcase-v2.html` — score 100
- `html/finops-suite/tsm-rcm-os.html` — score 100
- `html/logistics/logistics-situation-room.html` — score 100
- `html/finops-suite/rcm-os-presentation.html` — score 87
- `html/logistics/logistics-executive-portal.html` — score 75

### supplier

- `html/cyber-incident.html` — score 100
- `html/plant-incident.html` — score 100
- `html/supplier-shutdown.html` — score 100
- `html/supplier-vendor/supplier-vendor-situation-room.html` — score 100
- `html/supplier-vendor/supplier-vendor-executive-portal.html` — score 75

### hotel

- `html/hotelops/hotelops-howto.html` — score 100
- `html/hotelops/hotelops-war-room.html` — score 100
- `html/hotelops/hotelops-executive-portal.html` — score 90
- `html/concierge-command.html` — score 84
- `html/hotelops/hotelops-strategist.html` — score 75

### noc

- `html/l1-copilot/enterprise-command-center.html` — score 100
- `html/l1-copilot/noc/noc-executive-portal.html` — score 98
- `html/l1-copilot/noc/noc-war-room.html` — score 90
- `html/l1-copilot/noc/noc-strategist.html` — score 83
- `html/l1-copilot/noc/noc-asset-console.html` — score 41

### catalog

- `html/l1-copilot/vmware-copilot.html` — score 100
- `html/catalog-war-room.html` — score 82
- `html/war-rooms/catalog/catalog-war-room.html` — score 82
- `html/war-rooms/catalog/catalog-executive-portal.html` — score 75
- `html/war-rooms/catalog/catalog-strategist.html` — score 75

### approval

- `html/tsm-consultz-access.html` — score 100
- `html/war-rooms/approval/approval-war-room.html` — score 82
- `html/war-rooms/approval/approval-executive-portal.html` — score 75
- `html/war-rooms/approval/approval-strategist.html` — score 75

### bpo-war

- `html/war-rooms/bpo-war/bpo-demo-presentation.html` — score 100
- `html/war-rooms/bpo-war/bpo-executive-portal.html` — score 100
- `html/war-rooms/bpo-war/bpo-strategist.html` — score 100
- `html/war-rooms/bpo-war/bpo-war-room.html` — score 100

### cpq

- `html/cpq-war-room.html` — score 82
- `html/war-rooms/cpq/cpq-war-room.html` — score 82
- `html/war-rooms/cpq/cpq-executive-portal.html` — score 75
- `html/war-rooms/cpq/cpq-strategist.html` — score 75

### construct-war

- `html/war-rooms/construct-war/construction-executive-portal.html` — score 100
- `html/war-rooms/construct-war/construction-strategist.html` — score 100
- `html/war-rooms/construct-war/construction-war-room.html` — score 100

### crm

- `html/war-rooms/crm/crm-war-room.html` — score 82
- `html/war-rooms/crm/crm-executive-portal.html` — score 75
- `html/war-rooms/crm/crm-strategist.html` — score 75

### digital-twin

- `html/war-rooms/digital-twin/digital-twin.html` — score 92
- `html/war-rooms/digital-twin/digital-twin-executive-portal.html` — score 75
- `html/war-rooms/digital-twin/digital-twin-strategist.html` — score 75

### governance

- `html/war-rooms/governance/governance-executive-portal.html` — score 100
- `html/war-rooms/governance/governance-strategist.html` — score 100
- `html/war-rooms/governance/governance-war-room.html` — score 100

### insure-war

- `html/war-rooms/insure-war/insurance-executive-portal.html` — score 100
- `html/war-rooms/insure-war/insurance-strategist.html` — score 100
- `html/war-rooms/insure-war/insurance-war-room.html` — score 100

### integration-hub

- `html/war-rooms/integration-hub/integration-hub.html` — score 92
- `html/war-rooms/integration-hub/integration-hub-executive-portal.html` — score 75
- `html/war-rooms/integration-hub/integration-hub-strategist.html` — score 75

### legal-war

- `html/war-rooms/legal-war/legal-executive-portal.html` — score 100
- `html/war-rooms/legal-war/legal-main-strategist.html` — score 100
- `html/war-rooms/legal-war/legal-war-room.html` — score 100

### mdm

- `html/war-rooms/mdm/mdm-strategist.html` — score 100
- `html/war-rooms/mdm/mdm-war-room.html` — score 100
- `html/war-rooms/mdm/mdm-executive-portal.html` — score 75

### o2c

- `html/war-rooms/o2c/o2c-war-room.html` — score 90
- `html/war-rooms/o2c/o2c-executive-portal.html` — score 75
- `html/war-rooms/o2c/o2c-strategist.html` — score 75

### pm-copilot

- `html/war-rooms/pm-copilot/pm-command.html` — score 100
- `html/war-rooms/pm-copilot/pm-strategist.html` — score 100
- `html/war-rooms/pm-copilot/pm-exec-portal.html` — score 98

### property

- `html/demo/presentations/property-revenue-presentation.html` — score 7
- `html/demo/presentations/pm-copilot-presentation.html` — score 0
- `html/property-accountant/index.html` — score 0

### re-war

- `html/war-rooms/re-war/re-exec-portal.html` — score 100
- `html/war-rooms/re-war/re-strategist.html` — score 100
- `html/war-rooms/re-war/re-war-room.html` — score 100

### schools-command

- `html/war-rooms/schools-command/schools-command.html` — score 100
- `html/war-rooms/schools-command/schools-executive-portal.html` — score 90
- `html/war-rooms/schools-command/schools-strategist.html` — score 75

### real estate

- `html/legal-pro/case-strategist.html` — score 100
- `html/demo/presentations/realestate-presentation.html` — score 5

### business-development

- `html/war-rooms/business-development/tsm-outreach-command-center.html` — score 94

### honeywell-executive-portal.html

- `html/war-rooms/honeywell-executive-portal.html` — score 90

### honeywell-howto.html

- `html/war-rooms/honeywell-howto.html` — score 65

### honeywell-strategist.html

- `html/war-rooms/honeywell-strategist.html` — score 87

### itops

- `html/l1-copilot/tsm-itops-demo-presentation.html` — score 100

### schools

- `html/demo/presentations/schools-presentation.html` — score 0

### tsm-wip-command-center.html

- `html/war-rooms/tsm-wip-command-center.html` — score 94

### vendor

- `html/compliance/index.html` — score 100

### war-room-prep.html

- `html/war-rooms/war-room-prep.html` — score 100

## Recommended UX Pattern


### HOW TO USE THIS WORKSPACE

**1. What problem are you solving?**

Choose the business problem.

**2. Start**

Load your data, documents, records, or scenario.

**3. Analyze**

Run the applicable analysis.

**4. Review**

Understand findings, severity, exposure, root cause, and confidence.

**5. Decide**

Review recommendations and determine the next action.

**6. Execute**

Assign, resolve, escalate, appeal, approve, recover, or otherwise act.

**7. Generate the Output**

Create the report/package/brief that matters to the next stakeholder.

**8. Measure the Result**

Show dollars recovered, risk reduced, backlog removed, compliance improved,
time saved, or another measurable business outcome.


## Recommended Report Language


Avoid:

> Generate Report

Prefer:

> **Generate Revenue Leakage Snapshot**  
> Shows where money is being lost, the amount exposed, the root causes,
> and which issues should be addressed first.

> **Generate Executive Brief**  
> Converts operational findings into a management-ready summary of risk,
> financial exposure, decisions, and recommended actions.

> **Generate Compliance Package**  
> Packages exceptions, evidence, ownership, severity, and remediation
> status for management or audit review.

> **Generate Recovery Package**  
> Converts identified financial or operational leakage into actionable
> recovery opportunities and next steps.


## Implementation Recommendation


Do **not** add a giant How-To page to every HTML file.

Instead build a reusable TSM How-To component with:

- Start Here
- Current workflow
- Step indicator
- Next action
- Why this matters
- Expected output
- Report recommendations
- Business value
- Back / Next navigation
- Context-aware links

Then configure that component per vertical/workspace.
