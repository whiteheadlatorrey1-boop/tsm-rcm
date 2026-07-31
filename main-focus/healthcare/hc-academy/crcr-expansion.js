/* ══════════════════════════════════════════════════════════════════════
   CRCR EXPANSION BLOCK — Drop into your existing CRCR_DOMAINS object,
   CRCR_QUIZ array, and CRCR_DENIAL_CODES array.
   All formats match the existing data structure exactly.
   ══════════════════════════════════════════════════════════════════════ */


/* ── 1. NEW DOMAIN ENTRIES ─────────────────────────────────────────────
   Merge these into CRCR_DOMAINS alongside the existing keys.
   ─────────────────────────────────────────────────────────────────── */

// CRCR_DOMAINS['ar-management'] = { ... }
'ar-management': {
    label: 'A/R Management', badge: 'A/R', color: 'var(--rcm-claims)',
    concept: {
        title: 'Accounts Receivable Aging & Recovery',
        body: '<b>A/R aging</b> buckets unpaid claims by days outstanding: 0–30, 31–60, 61–90, 91–120, 120+. The target is to keep <b>Days in A/R under 50</b> for most practices. <b>Net Collection Rate (NCR)</b> measures actual collections vs. net collectible revenue — target ≥ 95%. <b>Gross Collection Rate (GCR)</b> is collections vs. billed charges. Work the 90+ bucket aggressively; most payers have a 180-day appeal window.'
    },
    scenarios: [
        { id: 'ar1', issue: 'A/R report shows 38% of claims are in the 90+ day bucket', task: 'Identify priority claims to work and outline a recovery action plan' },
        { id: 'ar2', issue: 'Net Collection Rate dropped from 97% to 89% month-over-month', task: 'Identify root cause categories and propose corrective actions' },
        { id: 'ar3', issue: 'Payer has not responded to a $14,000 claim submitted 75 days ago', task: 'Outline escalation steps: follow-up call, complaint, and state prompt pay statute' },
        { id: 'ar4', issue: 'Staff is writing off claims in the 120+ bucket without appeal attempt', task: 'Identify compliance risk and establish write-off authorization policy' },
        { id: 'ar5', issue: 'Days in A/R is 72 — 40% above target', task: 'Perform a root cause analysis across submission, denial, and follow-up workflows' },
    ],
    hints: {
        ar1: 'Sort 90+ bucket by payer and dollar value. Work high-dollar commercial claims first. Check for claims approaching appeal deadlines.',
        ar2: 'NCR drop = more write-offs or more contractual adjustments. Audit the adjustment reason codes. Distinguish between contractual (CO-45) and bad debt.',
        ar3: 'Call payer and get a reference number. If no response at 90 days, file a complaint with your state insurance commissioner. Reference state prompt pay statutes.',
        ar4: 'Writing off without an appeal attempt is a compliance risk. Establish a policy requiring supervisor approval for any write-off >$50 without a denial letter on file.',
        ar5: 'High DAR = slow submission, high denial rate, or slow follow-up. Benchmark each stage: submission lag, first-pass denial rate, and average days from denial to resolution.'
    },
    nodes: ['billing', 'financial', 'compliance']
},

// CRCR_DOMAINS['credentialing'] = { ... }
'credentialing': {
    label: 'Provider Credentialing', badge: 'CRED', color: 'var(--rcm-coding)',
    concept: {
        title: 'Provider Enrollment & Payer Credentialing',
        body: '<b>Credentialing</b> verifies a provider\'s qualifications before a payer enrolls them. <b>Re-credentialing</b> occurs every 2–3 years. A provider cannot bill under a payer until the <b>effective date</b> is issued. <b>NPI Type 1</b> = individual provider; <b>NPI Type 2</b> = organization/group. Billing under an un-credentialed provider results in CO-97 or payer-specific rejections. Gap periods between enrollment and effective date cause retroactive billing issues.'
    },
    scenarios: [
        { id: 'cr1', issue: 'New physician started seeing patients before payer credentialing was approved', task: 'Identify billing exposure and determine if retroactive enrollment is possible' },
        { id: 'cr2', issue: 'Provider\'s DEA certificate expired — payer suspended billing privileges', task: 'Outline the reinstatement process and identify claims at risk' },
        { id: 'cr3', issue: 'Claims submitted under group NPI but provider is not linked to the group in payer system', task: 'Identify the enrollment gap and map out the correction process' },
        { id: 'cr4', issue: 'Re-credentialing packet not submitted on time — 60-day lapse in payer status', task: 'Calculate revenue at risk and outline an emergency re-credentialing escalation path' },
        { id: 'cr5', issue: 'Payer enrolled provider under incorrect taxonomy code (208D00000X vs. 207R00000X)', task: 'Identify the taxonomy error and its claim impact, then correct in NPPES and payer system' },
    ],
    hints: {
        cr1: 'Some payers allow retro-enrollment back to the hire date. File immediately. Document the start date with signed contract. Claims during gap may need to be held and released upon approval.',
        cr2: 'DEA expiration = immediate suspension for controlled substance billing. Renew DEA, then notify each payer in writing. Pull all claims billed during lapse for review.',
        cr3: 'Provider must be formally linked (reassignment of benefits) to the group TIN/NPI in PECOS for Medicare and in each commercial payer\'s system separately.',
        cr4: 'Contact payer credentialing department immediately — request expedited review. Calculate revenue exposure by days × average daily charges for that provider.',
        cr5: 'Taxonomy codes define specialty. Wrong taxonomy → wrong fee schedule or outright rejection. Update in NPPES, notify payer, and resubmit affected claims with corrected taxonomy.'
    },
    nodes: ['billing', 'compliance', 'operations']
},

// CRCR_DOMAINS['patient-access'] = { ... }
'patient-access': {
    label: 'Patient Access', badge: 'ACCESS', color: 'var(--rcm-intake)',
    concept: {
        title: 'Pre-Registration, Scheduling & Authorization Workflow',
        body: '<b>Patient Access</b> is the revenue cycle front door. It includes <b>scheduling, pre-registration, insurance verification, prior authorization, and financial clearance</b>. Over <b>70% of denials</b> are traced to patient access failures. <b>Point-of-service collections</b> (copays, prior balances) are 3× easier to collect before service than after. <b>Referral requirements</b> vary by plan type: HMO requires referral + auth; PPO typically does not require referral but may require auth for high-cost services.'
    },
    scenarios: [
        { id: 'pa1', issue: 'Scheduled patient has an HMO plan but no referral on file for specialist visit', task: 'Identify denial risk and outline same-day resolution steps' },
        { id: 'pa2', issue: 'Patient presents with a new insurance card — eligibility not re-verified', task: 'Explain downstream billing risk and establish re-verification protocol' },
        { id: 'pa3', issue: 'Authorization approved for 3 PT visits but patient has attended 5', task: 'Identify the authorization overage risk and determine retroactive resolution path' },
        { id: 'pa4', issue: 'Point-of-service copay collection rate is 41% against a 90% target', task: 'Analyze collection failure causes and design a front-desk collection protocol' },
        { id: 'pa5', issue: 'Patient scheduled for outpatient surgery has a prior balance of $1,800 on account', task: 'Apply financial clearance policy — determine whether to proceed or require prior payment' },
    ],
    hints: {
        pa1: 'Call the PCP immediately to get a verbal referral, then follow up in writing. If no referral possible same day, notify patient of financial risk. Document all steps.',
        pa2: 'New insurance card = possible plan change. Re-verify eligibility via 270/271 at every visit. Update PMS immediately. Old insurance may not be billable.',
        pa3: 'Stop scheduling after approved visits are exhausted. File a retro-auth request immediately. If denied, clinical documentation may support a medical necessity appeal.',
        pa4: 'POS collection failures stem from staff discomfort, no scripting, and no policy. Train staff on scripted collection conversation. Post copay collection as a daily KPI.',
        pa5: 'Most practices require prior balance payment or a payment plan agreement before elective procedures. Document the financial clearance decision in the account.'
    },
    nodes: ['insurance', 'operations', 'financial']
},

// CRCR_DOMAINS['compliance-audit'] = { ... }
'compliance-audit': {
    label: 'Compliance & Audit', badge: 'AUDIT', color: 'var(--rcm-red)',
    concept: {
        title: 'OIG, RAC Audits & HIPAA Compliance',
        body: '<b>RAC (Recovery Audit Contractors)</b> identify Medicare overpayments and underpayments on a contingency basis. <b>OIG Work Plan</b> publishes annual audit targets — providers should self-audit against it. <b>HIPAA</b> requires a covered entity to respond to a breach within <b>60 days</b> of discovery. <b>False Claims Act</b> penalties: $13,000–$27,000 per claim + treble damages. <b>Stark Law</b> prohibits self-referral for designated health services. <b>Anti-Kickback Statute (AKS)</b> prohibits remuneration in exchange for referrals.'
    },
    scenarios: [
        { id: 'au1', issue: 'RAC audit requests medical records for 200 E/M claims from the past 18 months', task: 'Outline the response protocol, documentation pull timeline, and appeal rights' },
        { id: 'au2', issue: 'Internal audit reveals E/M levels were consistently upcoded across one physician\'s claims', task: 'Identify FCA exposure, outline self-disclosure path, and implement corrective action' },
        { id: 'au3', issue: 'A laptop with 3,200 unencrypted patient records was stolen', task: 'Apply the HIPAA breach notification rule — identify HHS, media, and patient notification requirements' },
        { id: 'au4', issue: 'Coder flags a physician referring patients to a lab the physician has a financial interest in', task: 'Identify the Stark Law issue and outline the compliance escalation path' },
        { id: 'au5', issue: 'OIG Work Plan targets "high-dose radiation therapy billing" — your facility bills for this service', task: 'Design a self-audit protocol to pre-empt OIG findings' },
    ],
    hints: {
        au1: 'RAC has a 45-day response deadline. Assign a coordinator. Pull records per the ADR letter list. Document chain of custody. Prepare an appeal if any overpayment determination is issued.',
        au2: 'Voluntary self-disclosure to OIG typically results in lower penalties. Downcode affected claims. Conduct a look-back. Implement a compliance plan with monitoring.',
        au3: 'HIPAA Breach Rule: notify affected individuals within 60 days, HHS within 60 days, and media if breach affects >500 in a single state. Document the investigation timeline.',
        au4: 'Stark Law violation = refund all improper payments + potential exclusion. Escalate to legal counsel immediately. Use the Stark Self-Referral Disclosure Protocol (SRDP) if applicable.',
        au5: 'Self-audit: pull 20 random claims, verify documentation supports the billed code, confirm physics consults documented, cross-check with LCD. Remediate before OIG contact.'
    },
    nodes: ['compliance', 'billing', 'medical']
},


/* ── 2. ADDITIONAL SCENARIOS FOR EXISTING DOMAINS ──────────────────────
   Append these to the existing scenarios arrays in the matching domains.
   ─────────────────────────────────────────────────────────────────── */

// Append to CRCR_DOMAINS.denials.scenarios
// Also add to CRCR_DOMAINS.denials.hints
ADDITIONAL_DENIAL_SCENARIOS: [
    { id: 'd6', issue: 'CO-96: Non-covered charge — service excluded from plan benefits', task: 'Verify plan exclusion, issue ABN if Medicare, or bill patient directly' },
    { id: 'd7', issue: 'CO-29: Time limit for filing has expired — no clearinghouse proof available', task: 'Check for valid exception (payer delay, natural disaster), determine write-off risk' },
    { id: 'd8', issue: 'OA-23: Impact of prior payer(s) adjudication including payments — COB issue', task: 'Coordinate EOBs from primary and secondary payer, resubmit with primary EOB attached' },
    { id: 'd9', issue: 'CO-119: Benefit maximum for this time period has been reached', task: 'Verify benefit limits on EOB, bill patient for excess, offer financial counseling' },
    { id: 'd10', issue: 'PI-204: Service not covered by this payer — patient self-pay', task: 'Convert to self-pay account, apply self-pay discount per policy, generate patient statement' },
],
ADDITIONAL_DENIAL_HINTS: {
    d6: 'Check SBC (Summary of Benefits and Coverage) for plan exclusions. For Medicare, a signed ABN shifts liability to patient. For commercial, verify contract carve-outs.',
    d7: 'CO-29 = timely filing exceeded with no clearinghouse proof. Check for documented system outages or payer-side delays. If no exception, write off per contract.',
    d8: 'Secondary billing requires the primary EOB. The secondary payer coordinates based on the primary\'s payment + patient responsibility. Always attach the primary EOB.',
    d9: 'Benefit maximums are patient contract terms. PR code = patient responsibility. Update billing system, generate statement, and offer payment plan or financial counseling.',
    pi204: 'PI (Payer Initiated) codes indicate payer-generated adjustments. PI-204 = not a covered service. Convert to self-pay, apply any cash-pay discount, and counsel patient.'
},

// Append to CRCR_DOMAINS.coding.scenarios
ADDITIONAL_CODING_SCENARIOS: [
    { id: 'c5', issue: 'Bilateral procedure submitted without Modifier 50', task: 'Identify the bilateral modifier requirement and correct the claim' },
    { id: 'c6', issue: 'Assistant surgeon billed at 100% of the surgeon fee', task: 'Apply correct assistant surgeon rules — Modifier 80 and percentage reduction' },
    { id: 'c7', issue: 'Telehealth visit coded as an in-office visit without place of service code 02', task: 'Correct POS code and apply telehealth-specific modifiers per payer policy' },
    { id: 'c8', issue: 'Split/shared E/M visit between physician and NP — physician billed at full rate', task: 'Apply CMS split/shared billing rules for 2023 guidelines' },
],
ADDITIONAL_CODING_HINTS: {
    c5: 'Modifier 50 = bilateral procedure performed same session. Most payers pay 150% of the unilateral rate. Some payers want two line items with RT/LT instead.',
    c6: 'Assistant surgeons bill at 16% of the primary surgeon\'s allowed amount. Modifier 80 = assistant surgeon; AS = PA/NP/clinical nurse specialist as assistant.',
    c7: 'POS 02 = telehealth other than home; POS 10 = telehealth in patient\'s home. Also add Modifier 95 for synchronous telehealth. Payer policies vary significantly.',
    c8: 'CMS 2023: split/shared E/M is billed by the provider who performs the substantive portion (history, exam, or MDM). Document clearly which provider performed each component.'
},

// Append to CRCR_DOMAINS.claims.scenarios
ADDITIONAL_CLAIMS_SCENARIOS: [
    { id: 'cl5', issue: 'Claim submitted on CMS-1500 for an inpatient facility service', task: 'Identify the correct claim form (UB-04) and required data elements for resubmission' },
    { id: 'cl6', issue: 'EDI 837 file rejected — payer loop 2010AA missing billing provider ZIP+4', task: 'Identify the loop/segment, correct the ZIP format, and resubmit' },
    { id: 'cl7', issue: 'Secondary claim submitted before primary ERA was received', task: 'Explain COB sequencing requirements and the correct resubmission process' },
],
ADDITIONAL_CLAIMS_HINTS: {
    cl5: 'CMS-1500 = professional/physician claims. UB-04 = institutional/facility claims. Inpatient requires UB-04 with admission date, discharge status, and condition codes.',
    cl6: 'Loop 2010AA = billing provider loop. ZIP+4 is required in some payer companion guides. Check the 277 rejection for the exact segment ID and element position.',
    cl7: 'Secondary payers require the primary EOB to adjudicate. Always wait for the primary 835 ERA before submitting to secondary. Attach primary payment info in loop 2320.'
},


/* ── 3. EXPANDED QUIZ BANK ──────────────────────────────────────────────
   Append all of these to the existing CRCR_QUIZ array.
   ─────────────────────────────────────────────────────────────────── */

ADDITIONAL_QUIZ_QUESTIONS: [
    // A/R Management
    { q: 'What is the industry benchmark target for Days in A/R?', opts: ['Under 30 days', 'Under 50 days', 'Under 90 days', 'Under 120 days'], ans: 1, explanation: 'Most RCM benchmarks target Days in A/R under 50. Under 40 is considered high-performing for a well-managed practice.' },
    { q: 'Net Collection Rate (NCR) measures:', opts: ['Total billed charges collected', 'Collections vs. net collectible revenue after adjustments', 'Cash collected vs. prior month', 'Total payments vs. total denials'], ans: 1, explanation: 'NCR = Cash Collected ÷ Net Collectible Revenue (billed charges minus contractual adjustments). Target ≥ 95%.' },
    { q: 'Which A/R aging bucket should be worked with the highest urgency?', opts: ['0–30 days', '31–60 days', '61–90 days', '90+ days'], ans: 3, explanation: '90+ day claims are approaching or past appeal deadlines. These need immediate attention to avoid write-off.' },
    { q: 'A provider has a Gross Collection Rate of 34%. This most likely indicates:', opts: ['Excellent billing performance', 'High write-offs relative to billed charges', 'Low billed charge rates', 'Excessive duplicate claims'], ans: 1, explanation: 'GCR = Collections ÷ Gross Charges. A low GCR often means high contractual write-offs, bad debt, or missed collections — not necessarily poor billing alone.' },

    // Credentialing
    { q: 'Which NPI type is assigned to a physician group practice?', opts: ['NPI Type 1', 'NPI Type 2', 'NPI Type 3', 'NPI Type 4'], ans: 1, explanation: 'NPI Type 2 is the organizational NPI assigned to group practices, hospitals, and other entities. Type 1 is the individual provider NPI.' },
    { q: 'A provider sees patients before payer credentialing is approved. The financial impact is:', opts: ['Minimal — payers backdate routinely', 'Claims will deny until enrollment is effective', 'Claims auto-approve under the group NPI', 'The provider can bill under a colleague\'s NPI'], ans: 1, explanation: 'Payers will not pay claims billed by an un-credentialed provider. Some allow retroactive enrollment to the hire/start date — most do not.' },
    { q: 'Re-credentialing with payers typically occurs every:', opts: ['6 months', '1 year', '2–3 years', '5 years'], ans: 2, explanation: 'Most payers require re-credentialing every 2–3 years. Expired credentialing leads to suspension of billing privileges.' },
    { q: 'Taxonomy codes in provider enrollment identify:', opts: ['The provider\'s billing address', 'The provider\'s medical specialty and classification', 'The payer\'s fee schedule tier', 'The practice\'s EHR system'], ans: 1, explanation: 'Taxonomy codes (Healthcare Provider Taxonomy Code Set) classify providers by specialty, type, and classification. Errors cause claim rejections and wrong fee schedule assignment.' },

    // Compliance & Audit
    { q: 'RAC auditors work on a:', opts: ['Salaried government contract', 'Contingency fee basis (percentage of identified overpayments)', 'Per-claim flat fee', 'Annual block grant'], ans: 1, explanation: 'RAC (Recovery Audit Contractors) are paid a contingency fee — a percentage of the overpayments they identify and recover. This incentivizes aggressive auditing.' },
    { q: 'The False Claims Act minimum penalty per false claim is approximately:', opts: ['$1,000', '$5,500', '$13,000', '$50,000'], ans: 2, explanation: 'FCA penalties are $13,946–$27,894 per false claim (2024 adjusted), plus treble damages. A high volume of false claims can result in catastrophic liability.' },
    { q: 'Under HIPAA, a covered entity must report a breach to HHS within:', opts: ['24 hours', '30 days', '60 days', '90 days'], ans: 2, explanation: 'HIPAA Breach Notification Rule: affected individuals must be notified within 60 days of discovery. HHS must also be notified within 60 days (or annually for breaches under 500).' },
    { q: 'The Stark Law prohibits:', opts: ['Billing for uncovered services', 'Physician self-referrals for designated health services', 'Upcoding E/M visits', 'Submitting claims after timely filing'], ans: 1, explanation: 'Stark Law (Ethics in Patient Referrals Act) prohibits physicians from referring Medicare/Medicaid patients to entities in which they have a financial interest for designated health services.' },
    { q: 'The OIG Work Plan is best used to:', opts: ['Negotiate payer contracts', 'Self-audit for services under active government scrutiny', 'Train front-desk staff on collections', 'Generate billing benchmarks'], ans: 1, explanation: 'The OIG Work Plan publishes annual audit targets. Providers should self-audit services listed in the plan to identify and remediate compliance gaps before government contact.' },

    // Patient Access
    { q: 'HMO plans typically require which of the following before a specialist visit?', opts: ['A copay only', 'A referral from the PCP', 'An ABN', 'A deductible payment'], ans: 1, explanation: 'HMO plans require a referral from the primary care physician before seeing a specialist. Failure to obtain a referral results in denial or patient financial responsibility.' },
    { q: 'Point-of-service (POS) collections refer to:', opts: ['Collecting payment via credit card terminal only', 'Collecting patient-owed balances at the time of service', 'Posting payments from the 835 ERA', 'Verifying insurance eligibility on the day of service'], ans: 1, explanation: 'POS collections = collecting copays, deductibles, and prior balances at check-in or checkout. They are significantly easier and cheaper to collect than post-service patient balances.' },
    { q: 'Which form is required before billing a Medicare patient for a non-covered service?', opts: ['CMS-1500', 'Advance Beneficiary Notice (ABN)', 'Assignment of Benefits', 'HIPAA Authorization'], ans: 1, explanation: 'An ABN must be signed by the Medicare beneficiary before a service Medicare may deny. Without it, the provider absorbs the write-off and cannot bill the patient.' },

    // Additional Coding
    { q: 'Modifier 50 is used for:', opts: ['Assistant surgeon services', 'Bilateral procedures performed in the same session', 'Repeat procedures by the same physician', 'Staged procedures'], ans: 1, explanation: 'Modifier 50 indicates a bilateral procedure performed during the same operative session. Most payers reimburse at 150% of the unilateral allowed amount.' },
    { q: 'Place of Service (POS) code 02 indicates:', opts: ['Inpatient hospital', 'Telehealth — other than patient\'s home', 'Outpatient hospital', 'Federally Qualified Health Center'], ans: 1, explanation: 'POS 02 = telehealth services provided at a location other than the patient\'s home. POS 10 = telehealth in the patient\'s home (added post-COVID).' },
    { q: 'What does an NCCI edit define?', opts: ['Timely filing windows by payer', 'CPT code pairs that should not be billed together', 'ICD-10 diagnosis groupings', 'Revenue code assignments for facility claims'], ans: 1, explanation: 'National Correct Coding Initiative (NCCI) edits define CPT code pairs that bundle — meaning they cannot be billed together unless a specific modifier applies.' },
    { q: 'Modifier 59 is used to indicate:', opts: ['A service performed by a different physician', 'A distinct procedural service not normally reported together', 'A bilateral procedure', 'A staged procedure over multiple days'], ans: 1, explanation: 'Modifier 59 = distinct procedural service. It overrides an NCCI edit when two services were truly separate and distinct. CMS prefers the more specific X-modifiers (XE, XP, XS, XU).' },

    // Additional Claims
    { q: 'The UB-04 claim form is used by:', opts: ['Individual physicians in private practice', 'Hospitals and institutional/facility providers', 'Durable medical equipment suppliers only', 'Dental providers exclusively'], ans: 1, explanation: 'UB-04 (CMS-1450) is the institutional claim form used by hospitals, SNFs, home health agencies, and other facility-based providers. Physicians use the CMS-1500.' },
    { q: 'A 277CA transaction is:', opts: ['The electronic remittance advice from payer to provider', 'The claim acknowledgment/acceptance report from the clearinghouse', 'The eligibility response from the payer', 'The enrollment confirmation from PECOS'], ans: 1, explanation: '277CA = Claim Acknowledgment. It confirms the clearinghouse received and accepted (or rejected) the 837 claim file before it reaches the payer for adjudication.' },
    { q: 'Frequency code 8 on a resubmitted claim indicates:', opts: ['Late filing exception', 'Void/cancel of prior claim', 'Replacement of prior claim', 'Original claim submission'], ans: 1, explanation: 'Frequency code 8 = void/cancel of the original claim. Frequency code 7 = replacement of prior claim. Always void before replacing to avoid duplicate claim denials.' },

    // Payment Posting
    { q: 'CARC stands for:', opts: ['Claim Adjustment Reference Code', 'Claim Adjudication Reason Code', 'Clearinghouse Acknowledgment and Receipt Code', 'Contractual Allowance Reduction Code'], ans: 0, explanation: 'CARC = Claim Adjustment Reason Code. Found in the CAS segment of the 835 ERA, it explains why the payment differs from the billed amount.' },
    { q: 'An underpayment appeal must typically be filed within:', opts: ['15 days of the ERA date', '30 days of the ERA date', '45–180 days of the ERA date depending on contract', 'Within 12 months regardless of contract'], ans: 2, explanation: 'Underpayment appeal windows are contract-specific, typically 45–180 days from the ERA date. Always audit the ERA against your fee schedule before the window closes.' },
    { q: 'CO-45 on an 835 ERA represents:', opts: ['A denial for medical necessity', 'The contractual adjustment between billed and allowed amount', 'A duplicate claim adjustment', 'Patient responsibility for deductible'], ans: 1, explanation: 'CO-45 is the standard contractual write-off code for in-network providers — the difference between billed charges and the contracted allowed amount. This is not a denial.' },

    // Financial Counseling
    { q: 'Federal Poverty Level (FPL) guidelines are primarily used to:', opts: ['Determine Medicare eligibility', 'Qualify patients for charity care and Medicaid programs', 'Set payer reimbursement rates', 'Calculate provider bonuses'], ans: 1, explanation: 'FPL guidelines are used to determine eligibility for charity care programs, Medicaid, and other financial assistance. Most hospitals set charity care thresholds at 200–400% FPL.' },
    { q: 'A patient\'s coinsurance is 30%. The allowed amount after a $500 deductible is $1,000. What does the patient owe?', opts: ['$150', '$300', '$350', '$500'], ans: 1, explanation: 'Coinsurance applies after the deductible. Patient owes 30% × $1,000 allowed = $300 coinsurance (deductible already satisfied separately).' },

    // General RCM
    { q: 'Which entity administers Medicare Part A and Part B claims processing?', opts: ['State Medicaid Agency', 'Medicare Administrative Contractor (MAC)', 'Recovery Audit Contractor (RAC)', 'CMS directly processes all claims'], ans: 1, explanation: 'MACs (Medicare Administrative Contractors) are regional entities that process Medicare Part A and Part B claims on behalf of CMS.' },
    { q: 'The Clean Claim Rate (CCR) target for a high-performing billing department is:', opts: ['Above 50%', 'Above 75%', 'Above 95%', 'Above 99%'], ans: 2, explanation: 'Industry benchmark for clean claim rate is ≥95%. A clean claim processes without additional information requests or corrections — directly tied to first-pass resolution rate.' },
    { q: 'Which of the following best describes the revenue cycle?', opts: ['The process of coding diagnoses into ICD-10 format', 'The administrative and clinical functions that contribute to capturing, managing, and collecting patient service revenue', 'The payer\'s internal claims adjudication workflow', 'The patient discharge and follow-up care process'], ans: 1, explanation: 'The revenue cycle encompasses every administrative and clinical function involved in generating, managing, and collecting revenue — from scheduling to final payment posting.' },
],


/* ── 4. EXPANDED DENIAL CODE LAB ────────────────────────────────────────
   Append these to the existing CRCR_DENIAL_CODES array.
   ─────────────────────────────────────────────────────────────────── */

ADDITIONAL_DENIAL_CODES: [
    {
        code: 'CO-96',
        name: 'Non-Covered Charge',
        color: 'var(--rcm-orange)',
        desc: 'Service is excluded from the patient\'s benefit plan. Not a billing error — the service simply isn\'t covered.',
        fixes: [
            'Verify the plan\'s Summary of Benefits for the excluded service',
            'For Medicare: obtain signed ABN to shift liability to patient',
            'For commercial: check contract carve-outs before billing patient',
            'Document in account as non-covered with payer confirmation'
        ]
    },
    {
        code: 'CO-97',
        name: 'Payment Included in Allowance for Another Service',
        color: 'var(--rcm-orange)',
        desc: 'The service/procedure is included in the payment for another service already adjudicated — often a bundling issue or global surgical package.',
        fixes: [
            'Identify the primary service the payer bundled this code into',
            'Check if a modifier (59, XU) is supported by clinical documentation',
            'Review global surgical package rules for the primary CPT',
            'If distinct service, appeal with operative note supporting separate service'
        ]
    },
    {
        code: 'CO-119',
        name: 'Benefit Maximum Reached',
        color: 'var(--muted2)',
        desc: 'Patient has reached the maximum benefit allowed for this service type within the plan period.',
        fixes: [
            'Verify benefit limit on the EOB or via 271 eligibility response',
            'This is a PR (patient responsibility) — do not appeal to payer',
            'Generate patient statement for the balance',
            'Offer financial counseling or payment plan per policy'
        ]
    },
    {
        code: 'OA-23',
        name: 'COB — Impact of Prior Payer Adjudication',
        color: 'var(--rcm-yellow)',
        desc: 'Secondary payer is applying coordination of benefits rules based on what the primary payer paid. Usually means the secondary\'s payment is $0 because primary paid at or above the allowed amount.',
        fixes: [
            'Pull the primary 835 ERA and confirm primary payment + adjustments',
            'Secondary pays only if primary payment < secondary\'s allowed amount',
            'If COB error, contact payer with copy of primary EOB',
            'If correct, write off the balance as a contractual COB adjustment'
        ]
    },
    {
        code: 'PI-204',
        name: 'Service Not Covered by This Payer',
        color: 'var(--muted2)',
        desc: 'Payer Initiated (PI) adjustment — the payer determines this service is not covered under their plan type. Patient cannot be billed for PI-coded denials without additional review.',
        fixes: [
            'Review the plan contract to confirm the service is truly excluded',
            'Do not automatically bill the patient — PI codes require analysis first',
            'If patient has secondary insurance, coordinate per COB rules',
            'Convert to self-pay only after confirming no payer liability'
        ]
    },
    {
        code: 'CO-B7',
        name: 'Provider Not Credentialed/Enrolled',
        color: 'var(--rcm-red)',
        desc: 'The rendering or billing provider is not enrolled or credentialed with the payer for this service or location.',
        fixes: [
            'Verify provider enrollment status in payer portal',
            'File enrollment application immediately if not credentialed',
            'Determine if payer allows retroactive enrollment to start date',
            'Hold all future claims until enrollment effective date is received'
        ]
    },
    {
        code: 'CO-29',
        name: 'Timely Filing — No Proof Available',
        color: 'var(--rcm-red)',
        desc: 'Claim filed outside the payer\'s timely filing window AND no clearinghouse proof exists to demonstrate timely submission.',
        fixes: [
            'Search all clearinghouse submission logs for any prior attempt',
            'Check for documented system outages or payer-side delays during the window',
            'Research payer\'s exception policy (natural disasters, system failures)',
            'If no exception applies, prepare for write-off; document for root cause prevention'
        ]
    },
    {
        code: 'CO-22',
        name: 'Coordination of Benefits — Other Payer Primary',
        color: 'var(--rcm-yellow)',
        desc: 'This payer is secondary. The claim must first be submitted and adjudicated by the primary payer before the secondary will process it.',
        fixes: [
            'Identify the correct primary payer via COB rules (Medicare as Secondary Payer rules if applicable)',
            'Submit to primary payer first — wait for 835 ERA',
            'Resubmit to secondary with primary EOB attached',
            'Update insurance order in the practice management system'
        ]
    },
],

/* ── END OF EXPANSION BLOCK ──────────────────────────────────────────── */