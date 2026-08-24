# TSM Consultz — Anomaly Response & Recovery Manual

**Internal training manual — how the TSM Apps handle real business scenarios by division**

---

## How to use this manual

Every division in InphusionSys runs the same underlying pattern: an anomaly (a business problem) or an IT ticket (a technical problem) is detected, assigned to the right role, and worked through a TSM App. This manual walks through **every anomaly and IT ticket scenario, division by division**, showing:

1. **What the anomaly looks like** in plain language
2. **Which TSM App handles it**, and what that app actually does with it
3. **Who it's assigned to**, and why that role
4. **What the employee should do**, step by step
5. **When to escalate**, and where it goes next

All divisions share the same three-tier escalation chain: **War Room → Strategist → Executive Portal**. The War Room is where the front-line employee first sees and works the anomaly. If it's high-dollar, high-risk, or unresolved, it escalates to the Strategist (a management-level view), and from there to the Executive Portal for leadership visibility. Every routed item gets a unique audit hash (`AUD-INPH-######`) so nothing moves through the system untracked.

IT tickets follow a separate, parallel path: they always route to the **L1 Ticket Copilot** (`html/l1-copilot/l1-ticket-copilot.html`), regardless of division, because IT issues are a shared support function across the whole company.

---

## Construction

**TSM App:** `/construction.html`  
**War Room / Strategist path:** `/html/war-rooms/construct-war`  
**IT routing target:** `/html/l1-copilot/l1-ticket-copilot.html`

**Team:**
- Diego Ramirez — Site Superintendent (`USER-CN-01`)
- Maria Gomez — Project Cost Controller (`USER-CN-02`)
- Tom Whitfield — Compliance & Insurance Coordinator (`USER-CN-03`)

**How the app helps:** Construction anomalies (cost overruns, expired insurance, lien exposure) land in the **Construction War Room** (`construction.html`). The AI engine chain reads the change order or draw package, flags the specific dollar variance and compliance gap, and produces a Best-Next-Course-of-Action (BNCA) card before any human touches it. From there the case escalates through the **Construction Strategist** to the **Executive Portal** if it crosses a dollar or risk threshold.

### Business Anomaly Scenarios

#### SCEN-CN-01 — Drywall CO #088 - Cost Overrun & Expired COI
**Severity:** High  
**Assigned to:** Maria Gomez (Project Cost Controller)

**What the employee does:**
1. Open `/construction.html` and pull up the flagged case (SCEN-CN-01).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Project Cost Controller. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the Construction Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-CN-02 — Lien Waiver Missing on Milestone Draw #4
**Severity:** Medium  
**Assigned to:** Tom Whitfield (Compliance & Insurance Coordinator)

**What the employee does:**
1. Open `/construction.html` and pull up the flagged case (SCEN-CN-02).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Compliance & Insurance Coordinator. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the Construction Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-CN-03 — Structural Steel PO #9910 - Variance Spike +32.1%
**Severity:** High  
**Assigned to:** Maria Gomez (Project Cost Controller)

**What the employee does:**
1. Open `/construction.html` and pull up the flagged case (SCEN-CN-03).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Project Cost Controller. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the Construction Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

### IT Ticket Scenarios

#### IT-CN-01 — VPN Failure
**Reported by:** Diego Ramirez (Site Superintendent)  
**Situation:** Site trailer VPN down, can't upload daily timesheets

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Network / Gateway, KB reference: KB-NET-014, owning team: Network Operations Center

**Troubleshooting steps the app walks you through:**
- Check local internet.
- Verify VPN portal status.
- Clear connection profiles.
- Test fallback gateway.

**Escalate immediately if:**
- Concentrator gateway unreachable.
- RADIUS timeout.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

#### IT-CN-02 — Printer Offline
**Reported by:** Maria Gomez (Project Cost Controller)  
**Situation:** Job-site plotter offline before permit submission deadline

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Device / Print Server, KB reference: KB-DEV-021, owning team: Desktop Support L2

**Troubleshooting steps the app walks you through:**
- Restart Print Spooler (net stop spooler && net start spooler).
- Ping printer IP.
- Check server print queue.
- Re-map printer.

**Escalate immediately if:**
- Print server down.
- Printer IP offline.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

---

## Healthcare

**TSM App:** `/html/healthcare/hc-denial-war-room.html`  
**War Room / Strategist path:** `/html/healthcare/hc-strategist.html`  
**IT routing target:** `/html/l1-copilot/l1-ticket-copilot.html`

**Team:**
- Dana Okafor — Revenue Cycle Analyst (`USER-HC-01`)
- Karen Brooks — Denials & Appeals Specialist (`USER-HC-02`)
- Raj Patel — Compliance Officer (`USER-HC-03`)

**How the app helps:** Claim and billing anomalies land in the **HC Denial War Room** (`html/healthcare/hc-denial-war-room.html`), a 5-engine chain ending in Engine 06, the BNCA (Best Next Course of Action) Dispatcher. It parses the payer denial code or filing deadline, calculates the dollar exposure, and routes the recommendation — with staff role, escalation path, and priority — to the correct person: Billing Coordinator, Appeals Specialist, or Office Manager. Escalating pushes the case, with the BNCA recommendation attached, to the **HC Strategist** and then the **Executive Portal**.

### Business Anomaly Scenarios

#### SCEN-HC-01 — Claim Denial CLM-88201 - CO-197 Missing Auth
**Severity:** High  
**Assigned to:** Karen Brooks (Denials & Appeals Specialist)

**What the employee does:**
1. Open `/html/healthcare/hc-denial-war-room.html` and pull up the flagged case (SCEN-HC-01).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Denials & Appeals Specialist. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the Healthcare Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-HC-02 — Patient PT-99021 Duplicate Billing Flag
**Severity:** Medium  
**Assigned to:** Dana Okafor (Revenue Cycle Analyst)

**What the employee does:**
1. Open `/html/healthcare/hc-denial-war-room.html` and pull up the flagged case (SCEN-HC-02).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Revenue Cycle Analyst. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the Healthcare Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-HC-03 — Claim CLM-90112 Timely Filing SLA Risk (82 of 90 Days)
**Severity:** High  
**Assigned to:** Dana Okafor (Revenue Cycle Analyst)

**What the employee does:**
1. Open `/html/healthcare/hc-denial-war-room.html` and pull up the flagged case (SCEN-HC-03).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Revenue Cycle Analyst. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the Healthcare Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

### IT Ticket Scenarios

#### IT-HC-01 — MFA Failure
**Reported by:** Raj Patel (Compliance Officer)  
**Situation:** MFA push failing on EHR access, patient waiting

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Identity Platform, KB reference: KB-SEC-008, owning team: Identity / SecOps SME

**Troubleshooting steps the app walks you through:**
- Check mobile device time sync.
- Verify IdP gateway health.
- Check registered auth method.
- Issue temporary bypass code.

**Escalate immediately if:**
- Unverified device loss.
- CA Policy block.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

#### IT-HC-02 — Patch Failure
**Reported by:** Dana Okafor (Revenue Cycle Analyst)  
**Situation:** Billing workstation failed monthly patch cycle

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: SCCM / Intune, KB reference: KB-SEC-019, owning team: Endpoint Engineering

**Troubleshooting steps the app walks you through:**
- Run Windows Update Troubleshooter.
- Reset WU components.
- Force SCCM cycle.
- Check WUAHandler.log.

**Escalate immediately if:**
- Distribution Point down.
- WMI corruption.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

---

## FinOps

**TSM App:** `/html/finops-command-suite-v2.html`  
**War Room / Strategist path:** `/html/finops-suite/finops-war`  
**IT routing target:** `/html/l1-copilot/l1-ticket-copilot.html`

**Team:**
- Marcus Lee — AP/AR Controller (`USER-FO-01`)
- Sophia Turner — Vendor Risk Analyst (`USER-FO-02`)
- Elena Rostova — Fraud & Anomaly Investigator (`USER-FO-03`)

**How the app helps:** Vendor and payment anomalies (fraud patterns, duplicate invoices) land in the **FinOps Command Suite** (`html/finops-command-suite-v2.html`). The engine flags the specific fraud or billing signature (split-PO thresholds, matching line items across invoices), assigns a risk score, and routes the case to the Fraud & Anomaly Investigator or Vendor Risk Analyst with a documented audit hash before it can be closed.

### Business Anomaly Scenarios

#### SCEN-FO-01 — Split Purchase Order - Threshold Evasion
**Severity:** High  
**Assigned to:** Elena Rostova (Fraud & Anomaly Investigator)

**What the employee does:**
1. Open `/html/finops-command-suite-v2.html` and pull up the flagged case (SCEN-FO-01).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Fraud & Anomaly Investigator. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the FinOps Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-FO-02 — Vendor V-9082 Duplicate Remittance
**Severity:** Medium  
**Assigned to:** Sophia Turner (Vendor Risk Analyst)

**What the employee does:**
1. Open `/html/finops-command-suite-v2.html` and pull up the flagged case (SCEN-FO-02).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Vendor Risk Analyst. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the FinOps Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-FO-03 — Invoice INV-99012 Duplicate Billing Anomaly ($18,400)
**Severity:** Medium  
**Assigned to:** Sophia Turner (Vendor Risk Analyst)

**What the employee does:**
1. Open `/html/finops-command-suite-v2.html` and pull up the flagged case (SCEN-FO-03).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Vendor Risk Analyst. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the FinOps Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

### IT Ticket Scenarios

#### IT-FO-01 — Disk Full
**Reported by:** Marcus Lee (AP/AR Controller)  
**Situation:** Month-end close workstation disk full, can't export ledger

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Device Storage, KB reference: KB-DEV-005, owning team: Desktop Support L1

**Troubleshooting steps the app walks you through:**
- Run cleanmgr.exe.
- Flush SoftwareDistribution.
- Clean temp files.
- Empty Recycle Bin.

**Escalate immediately if:**
- Bloated system file.
- Encryption log growth.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

#### IT-FO-02 — Network Connectivity Failure
**Reported by:** Elena Rostova (Fraud & Anomaly Investigator)  
**Situation:** Network drop mid-reconciliation, risk of partial write

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Network, KB reference: KB-NET-003, owning team: Network Operations Center

**Troubleshooting steps the app walks you through:**
- Check ipconfig.
- Ping loopback & gateway.
- Flush DNS.
- Verify link speed.

**Escalate immediately if:**
- Office subnet down.
- Switch port failure.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

---

## Real Estate

**TSM App:** `/html/reo-pro`  
**War Room / Strategist path:** `/html/war-rooms/re-war`  
**IT routing target:** `/html/l1-copilot/l1-ticket-copilot.html`

**Team:**
- David Miller — Property Manager (`USER-RE-01`)
- Priya Anand — Leasing Coordinator (`USER-RE-02`)
- Jamal Carter — Maintenance Ops Lead (`USER-RE-03`)

**How the app helps:** Property and lease anomalies land in the **Real Estate / PM War Room** (`html/reo-pro`, strategist at `html/war-rooms/pm-copilot/pm-strategist.html`). The engine calculates the SLA breach duration or revenue-at-risk from the vacancy/maintenance/lease data and routes the recommendation to Property Manager, Leasing Coordinator, or Maintenance Ops Lead depending on the anomaly type.

### Business Anomaly Scenarios

#### SCEN-RE-01 — Unit U-103 Vacancy & Maintenance SLA Breach
**Severity:** High  
**Assigned to:** David Miller (Property Manager)

**What the employee does:**
1. Open `/html/reo-pro` and pull up the flagged case (SCEN-RE-01).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Property Manager. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the Real Estate Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-RE-02 — Lease Renewal Auto-Escalation Clause Flag
**Severity:** Low  
**Assigned to:** Priya Anand (Leasing Coordinator)

**What the employee does:**
1. Open `/html/reo-pro` and pull up the flagged case (SCEN-RE-02).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Leasing Coordinator. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the Real Estate Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-RE-03 — Commercial Unit C-400 Lease Dispute - Unscheduled Rent Escalation
**Severity:** Medium  
**Assigned to:** Priya Anand (Leasing Coordinator)

**What the employee does:**
1. Open `/html/reo-pro` and pull up the flagged case (SCEN-RE-03).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Leasing Coordinator. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the Real Estate Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

### IT Ticket Scenarios

#### IT-RE-01 — Black Screen / No Display
**Reported by:** Jamal Carter (Maintenance Ops Lead)  
**Situation:** Leasing office monitor black screen before tour

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Device Hardware, KB reference: KB-DEV-012, owning team: Desktop Support L1

**Troubleshooting steps the app walks you through:**
- Press Win + Ctrl + Shift + B.
- Verify DP/HDMI/USB-C cables.
- Test docking bypass.
- Check BIOS output.

**Escalate immediately if:**
- GPU failure.
- Internal video chip defect.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

#### IT-RE-02 — Account Lockout
**Reported by:** Priya Anand (Leasing Coordinator)  
**Situation:** Locked out of tenant portal admin account

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Active Directory, KB reference: KB-AD-001, owning team: Identity / AD SME

**Troubleshooting steps the app walks you through:**
- Verify user identity.
- Inspect AD lockout source IP.
- Identify cached credentials.
- Unlock account.
- Re-authenticate.

**Escalate immediately if:**
- Repeated lockouts.
- Subnet-wide lockouts.
- DC replication failure.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

---

## Legal

**TSM App:** `/html/construction-suite/legal.html`  
**War Room / Strategist path:** `/html/war-rooms/legal-war`  
**IT routing target:** `/html/l1-copilot/l1-ticket-copilot.html`

**Team:**
- Victoria Vance — Contracts Counsel (`USER-LG-01`)
- Owen Bishop — Paralegal / Document Review (`USER-LG-02`)
- Nadia Farah — Compliance Counsel (`USER-LG-03`)

**How the app helps:** Contract and matter-review anomalies (bad clauses, missed deadlines, missing protections) land in the **Legal War Room** (`html/construction-suite/legal.html`). The engine reads the clause language, flags the specific legal exposure (unlimited liability, foreign venue, missing IP assignment, etc.), and hands counsel a redline-ready risk summary before the matter escalates to the Legal Strategist.

### Business Anomaly Scenarios

#### SCEN-LG-01 — MSA Review - Unlimited Liability & Foreign Venue
**Severity:** High  
**Assigned to:** Victoria Vance (Contracts Counsel)

**What the employee does:**
1. Open `/html/construction-suite/legal.html` and pull up the flagged case (SCEN-LG-01).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Contracts Counsel. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the Legal Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-LG-02 — NDA Auto-Renewal Missed Termination Window
**Severity:** Medium  
**Assigned to:** Owen Bishop (Paralegal / Document Review)

**What the employee does:**
1. Open `/html/construction-suite/legal.html` and pull up the flagged case (SCEN-LG-02).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Paralegal / Document Review. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the Legal Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-LG-03 — SOW #14 Missing Work-For-Hire IP Assignment Clause
**Severity:** Medium  
**Assigned to:** Nadia Farah (Compliance Counsel)

**What the employee does:**
1. Open `/html/construction-suite/legal.html` and pull up the flagged case (SCEN-LG-03).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Compliance Counsel. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the Legal Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

### IT Ticket Scenarios

#### IT-LG-01 — Application Crash
**Reported by:** Owen Bishop (Paralegal / Document Review)  
**Situation:** Document review tool crashing mid-redline

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Device Software, KB reference: KB-SW-044, owning team: Desktop Support L1

**Troubleshooting steps the app walks you through:**
- Inspect Event Viewer Application log.
- Repair app binaries.
- Clear %localappdata% cache.
- Check .NET runtimes.

**Escalate immediately if:**
- App bug.
- Database server drop.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

#### IT-LG-02 — Password Expired
**Reported by:** Nadia Farah (Compliance Counsel)  
**Situation:** Expired password blocking access to matter management system

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Active Directory, KB reference: KB-AD-002, owning team: Identity / Helpdesk L1

**Troubleshooting steps the app walks you through:**
- Verify user identity.
- Verify expiration flag in AD.
- Trigger SSPR reset.
- Sync across mobile/VPN.

**Escalate immediately if:**
- SSPR unreachable.
- Replication failure.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

---

## Insurance

**TSM App:** `/html/tsm-insurance`  
**War Room / Strategist path:** `/html/war-rooms/insure-war`  
**IT routing target:** `/html/l1-copilot/l1-ticket-copilot.html`

**Team:**
- Grace Holloway — Claims Adjuster (`USER-IN-01`)
- Ben Ostrowski — Underwriting Analyst (`USER-IN-02`)
- Talia Mensah — SIU / Fraud Investigator (`USER-IN-03`)

**How the app helps:** Claims anomalies land in the **Insurance War Room** (`html/tsm-insurance`). The engine cross-references claim data against policy terms and comparable-loss benchmarks, flags inconsistencies (date mismatches, reserve gaps, late endorsements), and routes high-severity items straight to the SIU/Fraud Investigator.

### Business Anomaly Scenarios

#### SCEN-IN-01 — Claim File CLM-30410 - Inconsistent Loss Date vs. Police Report
**Severity:** High  
**Assigned to:** Talia Mensah (SIU / Fraud Investigator)

**What the employee does:**
1. Open `/html/tsm-insurance` and pull up the flagged case (SCEN-IN-01).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as SIU / Fraud Investigator. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the Insurance Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-IN-02 — Policy Endorsement Applied After Loss Date
**Severity:** Medium  
**Assigned to:** Ben Ostrowski (Underwriting Analyst)

**What the employee does:**
1. Open `/html/tsm-insurance` and pull up the flagged case (SCEN-IN-02).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Underwriting Analyst. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the Insurance Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-IN-03 — Reserve Set 40% Below Comparable Loss Benchmark on CLM-30410
**Severity:** Medium  
**Assigned to:** Grace Holloway (Claims Adjuster)

**What the employee does:**
1. Open `/html/tsm-insurance` and pull up the flagged case (SCEN-IN-03).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Claims Adjuster. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the Insurance Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

### IT Ticket Scenarios

#### IT-IN-01 — Slow Network / Latency
**Reported by:** Grace Holloway (Claims Adjuster)  
**Situation:** Claims portal painfully slow during CAT event surge

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Network, KB reference: KB-NET-009, owning team: Network Operations Center

**Troubleshooting steps the app walks you through:**
- Run tracert.
- Check workstation bandwidth.
- Verify gateway QoS.
- Test without proxy.

**Escalate immediately if:**
- WAN link saturated.
- Regional packet drops.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

#### IT-IN-02 — VMware VM Down
**Reported by:** Ben Ostrowski (Underwriting Analyst)  
**Situation:** Underwriting rating engine VM unresponsive

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: VMware Infrastructure, KB reference: KB-VMW-010, owning team: VMware SME

**Troubleshooting steps the app walks you through:**
- Check vCenter power state.
- Check ESXi host heartbeats.
- Restart VM via vSphere.
- Inspect HA logs.

**Escalate immediately if:**
- Host PSOD.
- Storage APD condition.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

---

## Mortgage

**TSM App:** `/html/mortgage`  
**War Room / Strategist path:** `/html/war-rooms/mortgage`  
**IT routing target:** `/html/l1-copilot/l1-ticket-copilot.html`

**Team:**
- Colin Baxter — Loan Officer (`USER-MG-01`)
- Renee Castillo — Underwriter (`USER-MG-02`)
- Hassan Ali — Closing/Escrow Coordinator (`USER-MG-03`)

**How the app helps:** Loan file anomalies land in the **Mortgage War Room** (`html/mortgage`). The engine checks income documentation against verification-of-employment data, monitors regulatory timing windows (like the Closing Disclosure 3-day rule), and flags appraisal-vs-contract gaps before the loan can proceed to closing.

### Business Anomaly Scenarios

#### SCEN-MG-01 — Loan File LN-55210 - Income Doc Mismatch vs. VOE
**Severity:** High  
**Assigned to:** Renee Castillo (Underwriter)

**What the employee does:**
1. Open `/html/mortgage` and pull up the flagged case (SCEN-MG-01).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Underwriter. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the Mortgage Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-MG-02 — Closing Disclosure Sent Outside 3-Day Rule Window
**Severity:** High  
**Assigned to:** Hassan Ali (Closing/Escrow Coordinator)

**What the employee does:**
1. Open `/html/mortgage` and pull up the flagged case (SCEN-MG-02).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Closing/Escrow Coordinator. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the Mortgage Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-MG-03 — Appraisal Value 15% Below Contract Price - Gap Funding Risk
**Severity:** High  
**Assigned to:** Renee Castillo (Underwriter)

**What the employee does:**
1. Open `/html/mortgage` and pull up the flagged case (SCEN-MG-03).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Underwriter. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the Mortgage Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

### IT Ticket Scenarios

#### IT-MG-01 — Patch Failure
**Reported by:** Colin Baxter (Loan Officer)  
**Situation:** LOS workstation failed patch, blocking new loan intake

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: SCCM / Intune, KB reference: KB-SEC-019, owning team: Endpoint Engineering

**Troubleshooting steps the app walks you through:**
- Run Windows Update Troubleshooter.
- Reset WU components.
- Force SCCM cycle.
- Check WUAHandler.log.

**Escalate immediately if:**
- Distribution Point down.
- WMI corruption.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

#### IT-MG-02 — Printer Jam
**Reported by:** Hassan Ali (Closing/Escrow Coordinator)  
**Situation:** Closing docs printer jammed before signing appointment

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Device, KB reference: KB-DEV-022, owning team: Facilities / Field Support

**Troubleshooting steps the app walks you through:**
- Inspect paper trays 1-3.
- Verify paper weight.
- Power cycle hardware.

**Escalate immediately if:**
- Roller damage.
- Mechanical breakdown.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

---

## HotelOps

**TSM App:** `/html/hotelops/hotelops`  
**War Room / Strategist path:** `/html/hotelops/services`  
**IT routing target:** `/html/l1-copilot/l1-ticket-copilot.html`

**Team:**
- Layla Nasser — Front Office Manager (`USER-HO-01`)
- Kevin Dunmore — Revenue Manager (`USER-HO-02`)
- Sam Ito — Housekeeping/Facilities Lead (`USER-HO-03`)

**How the app helps:** Front-of-house and revenue anomalies land in the **HotelOps War Room** (`html/hotelops/hotelops`). The engine tracks rate parity against OTA channels, maintenance SLA timers per room, and payment/chargeback patterns, then routes the case to Revenue Manager, Front Office Manager, or Housekeeping/Facilities Lead.

### Business Anomaly Scenarios

#### SCEN-HO-01 — Rate Parity Breach - OTA Undercutting Direct Rate
**Severity:** Medium  
**Assigned to:** Kevin Dunmore (Revenue Manager)

**What the employee does:**
1. Open `/html/hotelops/hotelops` and pull up the flagged case (SCEN-HO-01).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Revenue Manager. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the HotelOps Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-HO-02 — Room 412 Maintenance Ticket Open 3 Days Past SLA
**Severity:** High  
**Assigned to:** Sam Ito (Housekeeping/Facilities Lead)

**What the employee does:**
1. Open `/html/hotelops/hotelops` and pull up the flagged case (SCEN-HO-02).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Housekeeping/Facilities Lead. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the HotelOps Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-HO-03 — Chargeback Disputes Filed on 6 Reservations - Possible Card Testing Fraud
**Severity:** High  
**Assigned to:** Kevin Dunmore (Revenue Manager)

**What the employee does:**
1. Open `/html/hotelops/hotelops` and pull up the flagged case (SCEN-HO-03).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Revenue Manager. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the HotelOps Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

### IT Ticket Scenarios

#### IT-HO-01 — Network Connectivity Failure
**Reported by:** Layla Nasser (Front Office Manager)  
**Situation:** Front desk PMS lost network connection during check-in rush

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Network, KB reference: KB-NET-003, owning team: Network Operations Center

**Troubleshooting steps the app walks you through:**
- Check ipconfig.
- Ping loopback & gateway.
- Flush DNS.
- Verify link speed.

**Escalate immediately if:**
- Office subnet down.
- Switch port failure.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

#### IT-HO-02 — BSOD / Device Crash
**Reported by:** Kevin Dunmore (Revenue Manager)  
**Situation:** Revenue management workstation blue screen

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Device OS, KB reference: KB-DEV-099, owning team: Desktop Support L2

**Troubleshooting steps the app walks you through:**
- Note Stop Code.
- Check recent driver/update pushes.
- Run sfc /scannow in Safe Mode.
- Check crash dumps.

**Escalate immediately if:**
- Hardware failure (RAM/NVMe).
- Unrecoverable boot loop.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

---

## BPO Services

**TSM App:** `/html/war-rooms/bpo-war`  
**War Room / Strategist path:** `/html/bpo-files`  
**IT routing target:** `/html/l1-copilot/l1-ticket-copilot.html`

**Team:**
- Chidi Eze — Operations Supervisor (`USER-BP-01`)
- Ana Beltran — Quality Assurance Lead (`USER-BP-02`)
- Wesley Chan — Client Success Manager (`USER-BP-03`)

**How the app helps:** Service-delivery anomalies land in the **BPO War Room** (`html/war-rooms/bpo-war`). The engine tracks AHT against contracted SLA, QA score trending, and SLA-credit exposure, then routes to Operations Supervisor, QA Lead, or Client Success Manager depending on whether the risk is operational or contractual.

### Business Anomaly Scenarios

#### SCEN-BP-01 — AHT Spike on Queue Q-14 Above Contracted SLA
**Severity:** Medium  
**Assigned to:** Chidi Eze (Operations Supervisor)

**What the employee does:**
1. Open `/html/war-rooms/bpo-war` and pull up the flagged case (SCEN-BP-01).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Operations Supervisor. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the BPO Services Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-BP-02 — QA Score Drop Below Client Floor for 2 Consecutive Weeks
**Severity:** High  
**Assigned to:** Ana Beltran (Quality Assurance Lead)

**What the employee does:**
1. Open `/html/war-rooms/bpo-war` and pull up the flagged case (SCEN-BP-02).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Quality Assurance Lead. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the BPO Services Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-BP-03 — Client SLA Credit Threshold Triggered - 3rd Consecutive Month
**Severity:** High  
**Assigned to:** Wesley Chan (Client Success Manager)

**What the employee does:**
1. Open `/html/war-rooms/bpo-war` and pull up the flagged case (SCEN-BP-03).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Client Success Manager. The app surfaces the *what*; you still own the *decision*.
4. **This is High severity** — escalate to the BPO Services Strategist immediately after logging your action. Don't sit on it waiting for more information.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

### IT Ticket Scenarios

#### IT-BP-01 — VPN Failure
**Reported by:** Chidi Eze (Operations Supervisor)  
**Situation:** Remote agents dropping off VPN mid-shift

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Network / Gateway, KB reference: KB-NET-014, owning team: Network Operations Center

**Troubleshooting steps the app walks you through:**
- Check local internet.
- Verify VPN portal status.
- Clear connection profiles.
- Test fallback gateway.

**Escalate immediately if:**
- Concentrator gateway unreachable.
- RADIUS timeout.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

#### IT-BP-02 — Account Lockout
**Reported by:** Wesley Chan (Client Success Manager)  
**Situation:** Client portal account locked out before QBR

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Active Directory, KB reference: KB-AD-001, owning team: Identity / AD SME

**Troubleshooting steps the app walks you through:**
- Verify user identity.
- Inspect AD lockout source IP.
- Identify cached credentials.
- Unlock account.
- Re-authenticate.

**Escalate immediately if:**
- Repeated lockouts.
- Subnet-wide lockouts.
- DC replication failure.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

---

## Career Training (A+)

**TSM App:** `/html/l1-copilot/aplus/aplus-learn.html`  
**War Room / Strategist path:** `/html/l1-copilot/aplus/aplus-readiness.html`  
**IT routing target:** `/html/l1-copilot/l1-ticket-copilot.html`

**Team:**
- Trainee - New Hire Cohort — L1 Technician (in training) (`USER-CR-01`)
- Instructor / Training Lead — Career Training Coordinator (`USER-CR-02`)

**How the app helps:** Training anomalies land in the **A+ Readiness Dashboard** (`html/l1-copilot/aplus/aplus-readiness.html`). The engine tracks per-domain exam readiness and cohort pass-rate trending, flagging weak domains before a trainee sits the real exam.

### Business Anomaly Scenarios

#### SCEN-CR-01 — Readiness Dashboard Flags Weak Domain: Security+ Sec Ops
**Severity:** Low  
**Assigned to:** Instructor / Training Lead (Career Training Coordinator)

**What the employee does:**
1. Open `/html/l1-copilot/aplus/aplus-learn.html` and pull up the flagged case (SCEN-CR-01).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Career Training Coordinator. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the Career Training (A+) Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-CR-02 — Cohort Pass-Rate Trending Below Certification Benchmark
**Severity:** Medium  
**Assigned to:** Instructor / Training Lead (Career Training Coordinator)

**What the employee does:**
1. Open `/html/l1-copilot/aplus/aplus-learn.html` and pull up the flagged case (SCEN-CR-02).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Career Training Coordinator. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the Career Training (A+) Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

### IT Ticket Scenarios

#### IT-CR-01 — Disk Full
**Reported by:** Trainee - New Hire Cohort (L1 Technician (in training))  
**Situation:** Practice environment VM disk full, PBQ sim won't load

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Device Storage, KB reference: KB-DEV-005, owning team: Desktop Support L1

**Troubleshooting steps the app walks you through:**
- Run cleanmgr.exe.
- Flush SoftwareDistribution.
- Clean temp files.
- Empty Recycle Bin.

**Escalate immediately if:**
- Bloated system file.
- Encryption log growth.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

---

## Core / PM Copilot

**TSM App:** `/html/war-rooms/pm-copilot/pm-strategist.html`  
**War Room / Strategist path:** `/html/war-rooms/pm-copilot`  
**IT routing target:** `/html/l1-copilot/l1-ticket-copilot.html`

**Team:**
- Isabelle Cross — Portfolio Manager (`USER-PM-01`)
- Derek Nolan — Program Coordinator (`USER-PM-02`)

**How the app helps:** Portfolio anomalies land in the **PM Strategist / Core War Room** (`html/war-rooms/pm-copilot/pm-strategist.html`). The engine rolls up milestone risk and resource conflicts across every active project the Portfolio Manager owns, flagging where multiple projects are converging on the same risk or the same over-committed resource.

### Business Anomaly Scenarios

#### SCEN-PM-01 — Portfolio Risk Rollup - 3 Projects Slipping Same Milestone
**Severity:** Medium  
**Assigned to:** Isabelle Cross (Portfolio Manager)

**What the employee does:**
1. Open `/html/war-rooms/pm-copilot/pm-strategist.html` and pull up the flagged case (SCEN-PM-01).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Portfolio Manager. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the Core / PM Copilot Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

#### SCEN-PM-02 — Cross-Portfolio Resource Conflict - Engineer Double-Booked on 3 Projects
**Severity:** Medium  
**Assigned to:** Derek Nolan (Program Coordinator)

**What the employee does:**
1. Open `/html/war-rooms/pm-copilot/pm-strategist.html` and pull up the flagged case (SCEN-PM-02).
2. Let the engine chain read the underlying document/data and generate its BNCA (Best Next Course of Action) recommendation — don't skip this; it's the dollar/risk analysis you'd otherwise do by hand.
3. Review the recommendation against your own judgment as Program Coordinator. The app surfaces the *what*; you still own the *decision*.
4. Log the action taken. Escalate to the Core / PM Copilot Strategist only if the case doesn't resolve at this tier or the numbers change materially.
5. The case is stamped with an audit hash automatically — you don't need to create your own tracking record.

### IT Ticket Scenarios

#### IT-PM-01 — Slow Network / Latency
**Reported by:** Derek Nolan (Program Coordinator)  
**Situation:** Portfolio dashboard latency during weekly rollup

**Route:** L1 Ticket Copilot (`/html/l1-copilot/l1-ticket-copilot.html`) — system: Network, KB reference: KB-NET-009, owning team: Network Operations Center

**Troubleshooting steps the app walks you through:**
- Run tracert.
- Check workstation bandwidth.
- Verify gateway QoS.
- Test without proxy.

**Escalate immediately if:**
- WAN link saturated.
- Regional packet drops.

Once resolved, click **GENERATE RESOLUTION** in the L1 Ticket Copilot — it builds the Problem / Cause / Actions Taken / Resolution / Validation / Next Steps record automatically and logs the closed ticket.

---
## Appendix A: IT Ticket Catalog Quick Reference

The L1 Ticket Copilot shares one library of 15 issue types across every division. Use this table to recognize a ticket type fast, before you even open the app.

| ID | Issue | System | Owning Team |
|---|---|---|---|
| scen-01 | Account Lockout | Active Directory | Identity / AD SME |
| scen-02 | Password Expired | Active Directory | Identity / Helpdesk L1 |
| scen-03 | MFA Failure | Identity Platform | Identity / SecOps SME |
| scen-04 | VPN Failure | Network / Gateway | Network Operations Center |
| scen-05 | Network Connectivity Failure | Network | Network Operations Center |
| scen-06 | Slow Network / Latency | Network | Network Operations Center |
| scen-07 | Printer Offline | Device / Print Server | Desktop Support L2 |
| scen-08 | Printer Jam | Device | Facilities / Field Support |
| scen-09 | Disk Full | Device Storage | Desktop Support L1 |
| scen-10 | BSOD / Device Crash | Device OS | Desktop Support L2 |
| scen-11 | Black Screen / No Display | Device Hardware | Desktop Support L1 |
| scen-12 | Application Crash | Device Software | Desktop Support L1 |
| scen-13 | Patch Failure | SCCM / Intune | Endpoint Engineering |
| scen-14 | VMware VM Down | VMware Infrastructure | VMware SME |
| scen-15 | VMware Datastore Full | Storage | VMware SME |

## Appendix B: The Escalation Chain, Explained

```
Anomaly/Ticket detected
        │
        ▼
   WAR ROOM  ──────────────► Engine chain reads the case, generates BNCA recommendation
        │                    (dollar impact, risk, recommended action, owning role)
        ▼
   Front-line employee reviews recommendation, takes action, logs it
        │
        ├── Resolved at this tier → closed, audit hash stands as the record
        │
        ▼ (High severity / unresolved / crosses a dollar threshold)
   STRATEGIST  ─────────────► Management-level view, cross-case pattern visibility
        │
        ▼ (still unresolved / leadership-relevant)
   EXECUTIVE PORTAL  ───────► Leadership visibility, portfolio-wide risk rollup
```

**Rule of thumb:** if you're unsure whether something is High severity, treat it as High. A late escalation is always recoverable; a missed one usually isn't.

## Appendix C: Division Directory

| Division | TSM App | Real App Path |
|---|---|---|
| Construction | Construction War Room | `/construction.html` |
| Healthcare | HC Denial War Room | `/html/healthcare/hc-denial-war-room.html` |
| FinOps | FinOps Command Suite | `/html/finops-command-suite-v2.html` |
| Real Estate | REO Pro / PM Strategist | `/html/reo-pro` |
| Legal | Legal Suite | `/html/construction-suite/legal.html` |
| Insurance | TSM Insurance | `/html/tsm-insurance` |
| Mortgage | Mortgage Suite | `/html/mortgage` |
| HotelOps | HotelOps | `/html/hotelops/hotelops` |
| BPO Services | BPO War Room | `/html/war-rooms/bpo-war` |
| Career Training (A+) | A+ Learn | `/html/l1-copilot/aplus/aplus-learn.html` |
| Core / PM Copilot | PM Strategist | `/html/war-rooms/pm-copilot/pm-strategist.html` |
| *(All divisions, IT)* | L1 Ticket Copilot | `/html/l1-copilot/l1-ticket-copilot.html` |

---

*This manual is generated from the live InphusionSys division data (`data/inphusionsys/divisions/*.json`). When new anomaly scenarios or divisions are added to InphusionSys, regenerate this manual so training material never drifts from the actual app behavior.*
