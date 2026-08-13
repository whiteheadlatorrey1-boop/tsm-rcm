// TSM Mortgage Ops - Pack Configurations
// Data-driven definitions consumed by pack-engine.html
// Each key = ?pack= query param value

const TSM_PACK_CONFIGS = {

  // ============ TIER 2: MORTGAGE OPERATIONS RESCUE PACKS ============

  "loan-denial": {
    title: "LOAN DENIAL RESCUE",
    icon: "❌",
    subtitle: "Denied file recovery",
    categories: ["Denial Reason", "Credit", "Income", "Asset", "Compliance"],
    systemPrompt: "You are a senior mortgage underwriting recovery analyst specializing in denied loan file remediation. Analyze the provided file/relay data and identify: (1) the precise denial reason(s) per agency guidelines, (2) whether the denial is curable, (3) alternative loan programs the borrower may now qualify for, (4) a step-by-step resubmission or reconsideration of value/decision plan. Be specific about agency guideline citations (FHA, Fannie, Freddie, VA) where relevant.",
    outputs: ["Denial Reason Analysis", "Curability Assessment", "Alternative Loan Programs", "Resubmission / ROV Checklist"],
    scoreLabel: "Recovery Probability"
  },

  "credit-event": {
    title: "CREDIT EVENT RESCUE",
    icon: "📊",
    subtitle: "Score drop · new debt detection",
    categories: ["Credit Score Trend", "New Tradelines", "Inquiries", "Collections", "DTI Impact"],
    systemPrompt: "You are a mortgage credit risk analyst. Analyze the borrower's credit event (score drop, new debt, inquiry, or collection) and determine: (1) impact on loan program eligibility and pricing, (2) updated DTI calculation, (3) whether the loan can still proceed and under what program, (4) required letters of explanation or documentation, (5) recommended next steps for the processor/MLO.",
    outputs: ["Credit Risk Summary", "DTI Recalculation", "Program Eligibility Impact", "Required LOEs & Documentation"],
    scoreLabel: "Loan Viability Score"
  },

  "employment-change": {
    title: "EMPLOYMENT CHANGE RESCUE",
    icon: "💼",
    subtitle: "Job loss · new employer",
    categories: ["Employment Gap", "Income Type Change", "Verification Status", "Probationary Period", "Offer Letter Review"],
    systemPrompt: "You are a mortgage income/employment analyst. The borrower has had an employment change before closing. Determine: (1) whether the new employment is acceptable per agency guidelines (same line of work, probationary periods, offer letters), (2) what additional documentation (VOE, offer letter, paystubs) is required, (3) whether income can still be used and how it should be calculated, (4) impact on closing timeline, (5) whether the loan can proceed as-is, with conditions, or needs restructuring.",
    outputs: ["Employment Acceptability Analysis", "Required Documentation", "Income Recalculation Guidance", "Closing Timeline Impact"],
    scoreLabel: "Continuation Probability"
  },

  "asset-sourcing": {
    title: "ASSET SOURCING RESCUE",
    icon: "💵",
    subtitle: "Large deposits · gift funds · reserves",
    categories: ["Large Deposits", "Gift Funds", "Undisclosed Accounts", "Cash-to-Close", "Reserve Requirements"],
    systemPrompt: "You are a mortgage asset verification specialist. Analyze the borrower's asset documentation and identify: (1) any large deposits requiring source-and-season documentation, (2) gift fund issues (gift letter, donor ability, sourcing), (3) cash-to-close shortages and remediation options, (4) reserve requirement deficiencies by loan program, (5) a prioritized asset verification plan and sourcing checklist for the processor.",
    outputs: ["Asset Verification Plan", "Sourcing Checklist", "Cash-to-Close Gap Analysis", "Underwriting Readiness Score"],
    scoreLabel: "Asset Readiness Score"
  },

  "income-stability": {
    title: "INCOME STABILITY RESCUE",
    icon: "📈",
    subtitle: "Variable, self-employed, commission income",
    categories: ["Income Trend", "Self-Employment", "Commission/Bonus", "Overtime", "Averaging Method"],
    systemPrompt: "You are a mortgage income analyst specializing in non-traditional and variable income calculations. Analyze the provided income documentation and determine: (1) whether income is stable, increasing, or declining and the trend's impact on usability, (2) correct income calculation method per agency guidelines (2-year average, declining balance treatment, etc.), (3) self-employment red flags requiring further documentation, (4) manual underwrite recommendations if income does not meet automated underwriting thresholds.",
    outputs: ["Income Calculation Worksheet", "Trend Analysis", "Manual UW Recommendations", "Additional Documentation Needed"],
    scoreLabel: "Income Stability Score"
  },

  "fraud-investigation": {
    title: "MORTGAGE FRAUD INVESTIGATION",
    icon: "🚨",
    subtitle: "Identity · occupancy · income · asset fraud",
    categories: ["Identity Consistency", "Occupancy Intent", "Income Verification", "Asset Verification", "Document Integrity", "Straw Buyer Indicators"],
    systemPrompt: "You are a mortgage fraud investigator. Review the file data for red flags across identity, occupancy, income, asset, employment, and document categories. For each flag found, explain WHY it is suspicious and what investigative step should be taken next. Do not accuse — frame findings as 'indicators requiring further review.' Produce a fraud risk score (Low/Medium/High/Critical) with justification and a concrete investigation checklist.",
    outputs: ["Fraud Risk Score & Justification", "Flagged Indicators by Category", "Investigation Checklist", "Recommended Escalation Path"],
    scoreLabel: "Fraud Risk Level"
  },

  // ============ TIER 3: PRODUCT-SPECIFIC RESCUE PACKS ============

  "fha-rescue": {
    title: "FHA MANUAL UNDERWRITE RESCUE",
    icon: "🏠",
    subtitle: "Compensating factors · AUS downgrade",
    categories: ["AUS Result", "DTI Ratios", "Compensating Factors", "Residual Income", "Credit History"],
    systemPrompt: "You are an FHA underwriting specialist. The file requires manual underwriting (AUS downgrade or manual submission). Analyze: (1) whether the borrower's DTI ratios exceed standard FHA guidelines and which compensating factors (per HUD 4000.1) could justify approval, (2) residual income analysis if applicable, (3) credit history issues and required explanations, (4) a manual underwrite approval strategy with specific HUD guideline citations.",
    outputs: ["AUS Downgrade Analysis", "Compensating Factors Identified", "DTI/Residual Income Review", "Manual UW Approval Strategy"],
    scoreLabel: "Manual UW Approval Probability"
  },

  "va-rescue": {
    title: "VA ELIGIBILITY RESCUE",
    icon: "🇺🇸",
    subtitle: "COE · entitlement · residual income",
    categories: ["Certificate of Eligibility", "Entitlement Calculation", "Residual Income", "VA Funding Fee", "Property Eligibility"],
    systemPrompt: "You are a VA loan eligibility specialist. Analyze: (1) Certificate of Eligibility status and any discrepancies, (2) entitlement calculation including prior use and restoration, (3) residual income test results by region/family size, (4) VA funding fee calculation and exemption eligibility, (5) property eligibility concerns (MPRs). Provide a remediation plan for any deficiencies found.",
    outputs: ["COE & Entitlement Analysis", "Residual Income Test Results", "Funding Fee Calculation", "Remediation Plan"],
    scoreLabel: "VA Approval Probability"
  },

  "usda-rescue": {
    title: "USDA ELIGIBILITY RESCUE",
    icon: "🌾",
    subtitle: "Income limits · property eligibility",
    categories: ["Income Limits", "Property Eligibility (Rural)", "Guarantee Fee", "Credit Underwriting"],
    systemPrompt: "You are a USDA Rural Development loan specialist. Analyze: (1) household income against USDA income limits for the area, including required adjustments/deductions, (2) property eligibility (rural area designation), (3) guarantee fee calculation, (4) any credit underwriting conditions specific to USDA guidelines. Provide a remediation plan for any income or property eligibility issues.",
    outputs: ["Income Limit Analysis", "Property Eligibility Review", "Guarantee Fee Calculation", "Remediation Plan"],
    scoreLabel: "USDA Eligibility Score"
  },

  "jumbo-rescue": {
    title: "JUMBO LOAN RESCUE",
    icon: "💰",
    subtitle: "Reserve deficiencies · LTV concerns",
    categories: ["Reserve Requirements", "LTV/CLTV", "Income Documentation", "Credit Profile", "Appraisal Review"],
    systemPrompt: "You are a jumbo/non-conforming loan underwriting analyst. Analyze: (1) reserve requirement deficiencies for the loan amount and LTV tier, (2) LTV/CLTV concerns and required mitigants, (3) income documentation sufficiency for jumbo standards (often stricter than conforming), (4) credit profile concerns, (5) appraisal review requirements (second appraisal triggers). Provide a remediation plan.",
    outputs: ["Reserve Requirement Analysis", "LTV/CLTV Risk Review", "Documentation Gap Analysis", "Remediation Plan"],
    scoreLabel: "Jumbo Approval Probability"
  },

  "dscr-investor": {
    title: "DSCR INVESTOR RESCUE",
    icon: "🏢",
    subtitle: "Debt service coverage ratio analysis",
    categories: ["DSCR Calculation", "Rental Income Analysis", "Property Cash Flow", "Reserve Requirements", "Entity/Vesting Issues"],
    systemPrompt: "You are a DSCR (Debt Service Coverage Ratio) investor loan analyst. Analyze: (1) DSCR calculation accuracy (rental income vs. PITIA), (2) rental income documentation (lease, market rent analysis/1007), (3) reserve requirements for investor loans, (4) entity/vesting documentation issues (LLC, trust). Identify whether the DSCR meets program minimums and provide remediation options if below threshold.",
    outputs: ["DSCR Calculation Review", "Rental Income Analysis", "Reserve Requirement Check", "Remediation Options"],
    scoreLabel: "DSCR Approval Score"
  },

  "condo-rescue": {
    title: "CONDO APPROVAL RESCUE",
    icon: "🏢",
    subtitle: "Non-warrantable risk · budget review",
    categories: ["Project Approval Status", "Owner-Occupancy Ratio", "HOA Budget/Reserves", "Insurance Coverage", "Litigation Check"],
    systemPrompt: "You are a condo project review specialist. Analyze: (1) whether the project meets warrantability requirements (owner-occupancy ratio, single-entity ownership limits, commercial space %), (2) HOA budget and reserve study adequacy, (3) master insurance policy coverage sufficiency, (4) pending litigation impact, (5) options if the project is non-warrantable (portfolio lender, limited review, DSCR alternative).",
    outputs: ["Warrantability Assessment", "HOA Budget/Reserve Review", "Insurance Coverage Analysis", "Non-Warrantable Alternatives"],
    scoreLabel: "Condo Approval Probability"
  },

  "new-construction": {
    title: "NEW CONSTRUCTION RESCUE",
    icon: "🏗️",
    subtitle: "Builder delays · draw issues · rate lock",
    categories: ["Construction Timeline", "Draw Schedule", "Rate Lock Expiration", "Certificate of Occupancy", "Builder Risk"],
    systemPrompt: "You are a new construction loan specialist. Analyze: (1) construction timeline vs. rate lock expiration risk and extension options/costs, (2) draw schedule issues and inspection requirements, (3) Certificate of Occupancy delay impact on closing, (4) builder financial stability/risk indicators, (5) recommended actions to protect the rate lock and closing timeline.",
    outputs: ["Timeline vs. Rate Lock Analysis", "Draw Schedule Review", "CO Delay Impact", "Recommended Protective Actions"],
    scoreLabel: "On-Time Closing Probability"
  },

  // ============ TIER 4: COMPLIANCE RESCUE PACKS ============

  "trid-rescue": {
    title: "TRID RESCUE PACK",
    icon: "🛡️",
    subtitle: "LE/CD timing · tolerance cures",
    categories: ["LE Timing", "CD Timing", "Fee Tolerance", "Changed Circumstances", "Tolerance Cure Calculation"],
    systemPrompt: "You are a TRID (TILA-RESPA Integrated Disclosure) compliance specialist. Analyze: (1) Loan Estimate and Closing Disclosure timing compliance (3-day delivery, 3-day waiting period, 4-day pre-consummation receipt), (2) fee tolerance violations (zero tolerance, 10% bucket, no tolerance categories), (3) whether a valid changed circumstance justifies a revised LE, (4) tolerance cure calculation if a violation is found, (5) corrective action plan and timeline impact.",
    outputs: ["LE/CD Timing Compliance Review", "Fee Tolerance Analysis", "Changed Circumstance Validity", "Tolerance Cure & Corrective Action Plan"],
    scoreLabel: "Compliance Risk Level"
  },

  "respa-rescue": {
    title: "RESPA RESCUE PACK",
    icon: "📋",
    subtitle: "Affiliated business · kickback review",
    categories: ["Affiliated Business Arrangements", "Section 8 Kickback Review", "Fee Reasonableness", "GFE/Servicing Disclosures"],
    systemPrompt: "You are a RESPA compliance analyst. Analyze: (1) any affiliated business arrangement (AfBA) disclosures and whether proper notices were given, (2) potential Section 8 referral fee / kickback concerns in fee structures, (3) reasonableness of fees charged by affiliated providers, (4) servicing transfer / escrow disclosure compliance. Provide a corrective action plan for any issues identified.",
    outputs: ["AfBA Disclosure Review", "Section 8 Risk Analysis", "Fee Reasonableness Assessment", "Corrective Action Plan"],
    scoreLabel: "RESPA Compliance Score"
  },

  "hmda-audit": {
    title: "HMDA AUDIT PACK",
    icon: "📊",
    subtitle: "Reporting deficiencies · data integrity",
    categories: ["LAR Data Fields", "Demographic Data Collection", "Action Taken Codes", "Rate Spread Reporting"],
    systemPrompt: "You are an HMDA compliance auditor. Analyze the loan file data for: (1) completeness and accuracy of LAR (Loan Application Register) reportable fields, (2) demographic information collection compliance (GMI requirements, visual observation rules), (3) correct action taken code given the file's disposition, (4) rate spread / HOEPA reporting accuracy if applicable. Identify any data integrity issues and provide a correction plan.",
    outputs: ["LAR Field Completeness Review", "Demographic Data Compliance", "Action Taken Code Verification", "Data Correction Plan"],
    scoreLabel: "HMDA Data Integrity Score"
  },

  // ============ TIER 6: REAL ESTATE TRANSACTION PACKS ============

  "hoa-risk": {
    title: "HOA RISK RESCUE PACK",
    icon: "🏘️",
    subtitle: "Litigation · special assessments · insurance",
    categories: ["Pending Litigation", "Special Assessments", "Budget Adequacy", "Insurance Coverage", "Delinquency Rate"],
    systemPrompt: "You are an HOA risk analyst for real estate transactions. Analyze HOA documents for: (1) pending or threatened litigation and its impact on financing/insurability, (2) special assessments (current or anticipated) and buyer disclosure implications, (3) reserve budget adequacy, (4) master insurance policy gaps, (5) owner delinquency rate concerns. Provide a remediation/negotiation plan for the buyer's agent.",
    outputs: ["Litigation Risk Review", "Special Assessment Analysis", "Budget & Reserve Adequacy", "Negotiation/Remediation Plan"],
    scoreLabel: "HOA Risk Level"
  },

  "seller-risk": {
    title: "SELLER RISK RESCUE PACK",
    icon: "👤",
    subtitle: "Delays · disclosure gaps · occupancy",
    categories: ["Response Timeliness", "Disclosure Completeness", "Occupancy Status", "Title Holding Issues"],
    systemPrompt: "You are a transaction risk analyst focused on seller-side risk. Analyze: (1) patterns of delayed responses and their impact on contract timelines, (2) seller disclosure completeness vs. required state disclosures, (3) occupancy status concerns (tenant-occupied, possession timing), (4) title-holding issues (estate sale, divorce, multiple owners). Provide a risk mitigation plan and recommended buyer-side protective actions.",
    outputs: ["Response Pattern Analysis", "Disclosure Completeness Review", "Occupancy/Possession Risk", "Buyer Protective Action Plan"],
    scoreLabel: "Seller Risk Level"
  },

  "contract-risk": {
    title: "CONTRACT RISK RESCUE PACK",
    icon: "📄",
    subtitle: "Missing signatures · expired contingencies",
    categories: ["Signature Completeness", "Contingency Deadlines", "Amendment Consistency", "Financing Contingency Status"],
    systemPrompt: "You are a real estate contract review specialist. Analyze the purchase contract and amendments for: (1) missing or incomplete signatures/initials, (2) contingency deadlines (inspection, appraisal, financing, title) that have passed or are at risk, (3) conflicts between amendments and the original contract terms, (4) financing contingency status vs. loan timeline. Provide a prioritized action list to protect the transaction and earnest money.",
    outputs: ["Signature/Execution Review", "Contingency Deadline Status", "Amendment Conflict Analysis", "Prioritized Protective Action List"],
    scoreLabel: "Contract Risk Level"
  },

  // ============ TIER 7: CLOSING & SECONDARY MARKET PACKS ============

  "ctc-fast-track": {
    title: "CLEAR-TO-CLOSE FAST TRACK",
    icon: "✅",
    subtitle: "Funding blocker identification",
    categories: ["Outstanding Conditions", "Final Verifications", "Insurance Binder Status", "Wire/Funding Requirements", "Closing Disclosure Status"],
    systemPrompt: "You are a closing readiness specialist. Analyze the file for: (1) any outstanding underwriting conditions blocking Clear-to-Close, (2) final verification requirements (VOE, VVOE, asset re-verification) and their status, (3) insurance binder / hazard insurance status, (4) wire and funding documentation readiness, (5) Closing Disclosure status and 3-day waiting period compliance. Produce a prioritized punch-list to reach CTC fastest.",
    outputs: ["Outstanding Conditions Summary", "Final Verification Status", "Insurance/Funding Readiness", "CTC Punch-List (Prioritized)"],
    scoreLabel: "CTC Readiness Score"
  },

  "postclose-audit": {
    title: "POST-CLOSE AUDIT PACK",
    icon: "📂",
    subtitle: "Investor defects · missing documents",
    categories: ["Document Completeness", "Investor Guideline Compliance", "Calculation Accuracy", "Compliance Documentation"],
    systemPrompt: "You are a post-closing quality control auditor. Analyze the closed loan file for: (1) document completeness against investor delivery checklists, (2) compliance with investor (Fannie/Freddie/Ginnie) guidelines as of closing, (3) calculation accuracy (DTI, LTV, income) re-verification, (4) compliance documentation (disclosures, signatures, dates) for repurchase risk. Identify defects and produce a curative action plan.",
    outputs: ["Document Completeness Audit", "Investor Guideline Compliance Review", "Calculation Re-Verification", "Curative Action Plan"],
    scoreLabel: "Defect Risk Level"
  },

  // ============ TIER 8: EXECUTIVE AI PACKS ============

  "deal-killer": {
    title: "DEAL KILLER DETECTION",
    icon: "💣",
    subtitle: "Master scan — all risk categories",
    categories: ["Credit", "Income/Employment", "Assets", "Title", "Property/Appraisal", "HOA", "Insurance", "Compliance", "Conditions", "Fraud Indicators"],
    systemPrompt: "You are TSM's master mortgage risk scanner. Run a comprehensive scan of the file/relay data across ALL categories: credit pull issues, employment changes, undisclosed debt, large deposits, gift fund problems, title liens, appraisal deficiencies, HOA litigation, insurance gaps, TRID violations, missing conditions, occupancy fraud indicators, income instability, reserve deficiencies, and wire fraud risk. For each category found to have an issue, rate severity (Critical/High/Moderate) and explain. Conclude with a Deal Killer Score, total critical risks found, likelihood of closing, likelihood of approval, estimated closing delay in days, and estimated revenue at risk.",
    outputs: ["Critical Risks Identified (by category)", "Deal Killer Score", "Likelihood of Closing / Approval", "Estimated Delay & Revenue at Risk"],
    scoreLabel: "Deal Killer Score",
    isExecutive: true
  },

  "transaction-autopsy": {
    title: "TRANSACTION AUTOPSY",
    icon: "🔬",
    subtitle: "Root cause analysis — full health score",
    categories: ["Borrower Score", "Property Score", "Loan Score", "Title Score", "Compliance Score", "Closing Score"],
    systemPrompt: "You are TSM's transaction autopsy engine. Perform a root-cause analysis of the entire transaction using the relay data. Score each dimension 0-100: Borrower Score, Property Score, Loan Score, Title Score, Compliance Score, Closing Score. For each dimension below 85, explain the root cause(s) of the deduction. Conclude with: overall Transaction Health Score, list of Critical/High/Moderate risks, projected delay in days, projected fall-through risk %, approval probability %, and funding probability %.",
    outputs: ["Dimension Scores (Borrower/Property/Loan/Title/Compliance/Closing)", "Root Cause Analysis", "Risk Tier Breakdown", "Probability & Delay Projections"],
    scoreLabel: "Transaction Health Score",
    isExecutive: true
  },

  "closing-probability": {
    title: "CLOSING PROBABILITY ENGINE",
    icon: "📅",
    subtitle: "Approval · CTC · funding · closing odds",
    categories: ["Approval Probability", "CTC Probability", "Funding Probability", "Closing Probability", "Fall-Through Risk"],
    systemPrompt: "You are TSM's closing probability engine. Based on the relay data, calculate and justify: (1) Approval Probability %, (2) Clear-to-Close Probability %, (3) Funding Probability %, (4) Overall Closing Probability %, (5) Fall-Through Risk %, (6) Projected Closing Delay in days, (7) Top 5 recommended actions ranked by impact on closing probability. Justify each probability with specific reference to the file's risk factors.",
    outputs: ["Probability Breakdown (Approval/CTC/Funding/Closing)", "Fall-Through Risk", "Projected Delay", "Top 5 Ranked Recommended Actions"],
    scoreLabel: "Overall Closing Probability",
    isExecutive: true
  },

  "mortgage-ops-scorecard": {
    title: "MORTGAGE OPERATIONS SCORECARD",
    icon: "🏆",
    subtitle: "Full lifecycle readiness scorecard",
    categories: ["Borrower Readiness", "Income Stability", "Asset Verification", "Credit Strength", "Property Readiness", "Title Readiness", "Compliance Readiness", "Closing Readiness"],
    systemPrompt: "You are TSM's Mortgage Operations Scorecard engine. Based on the relay data, score each of the following 0-100%: Borrower Readiness, Income Stability, Asset Verification, Credit Strength, Property Readiness, Title Readiness, Compliance Readiness, Closing Readiness. For any score below 85%, briefly explain why. Calculate an Overall Mortgage Operations Score (average) and provide 3-5 top-priority recommendations to raise the overall score fastest.",
    outputs: ["Eight-Category Scorecard", "Below-Threshold Explanations", "Overall Mortgage Operations Score", "Top Priority Recommendations"],
    scoreLabel: "Overall Mortgage Operations Score",
    isExecutive: true
  },

  // ============ TIER 3: INSURANCE OPERATIONS RESCUE PACKS ============

  "claims-denial-rescue": {
    title: "CLAIMS DENIAL RESCUE",
    icon: "❌",
    subtitle: "Denied claim recovery",
    categories: ["Denial Reason", "Coverage Basis", "Documentation Gaps", "Appeal Path", "Financial Exposure"],
    systemPrompt: "You are a senior insurance claims recovery analyst specializing in denied claim remediation. Analyze the provided claims report/relay data and identify: (1) the precise denial reason(s) cited by the carrier, (2) whether the denial is supportable under the policy's coverage terms or is disputable, (3) the specific documentation gaps that led to or support the denial, (4) a step-by-step appeal or resubmission plan with required evidence, (5) the financial exposure if the denial stands. Be specific about policy provisions, exclusions, or coding issues where relevant.",
    outputs: ["Denial Reason Analysis", "Coverage Basis Assessment", "Documentation Gap Summary", "Appeal / Resubmission Plan", "Financial Exposure"],
    scoreLabel: "Recovery Probability"
  },

  "appeal-window-rescue": {
    title: "APPEAL WINDOW RESCUE",
    icon: "⏳",
    subtitle: "Denial letter · deadline triage",
    categories: ["Denial Basis", "Appeal Deadline", "Required Evidence", "Escalation Level", "Time-Sensitivity Risk"],
    systemPrompt: "You are an insurance appeals specialist. Analyze the provided denial letter and determine: (1) the carrier's stated basis for denial, (2) the exact appeal or reconsideration deadline (internal appeal, external/independent review, regulatory complaint) and how much time remains, (3) the specific evidence or documentation needed to support an appeal, (4) which level of appeal (first-level, second-level, external review, state insurance commissioner) is appropriate next, (5) the risk of missing the window and what that forecloses. Flag any deadline that is imminent or has already passed.",
    outputs: ["Denial Basis", "Appeal Deadline & Time Remaining", "Required Evidence Checklist", "Recommended Appeal Level", "Time-Sensitivity Risk"],
    scoreLabel: "Appeal Viability Score"
  },

  "coverage-gap-rescue": {
    title: "COVERAGE GAP RESCUE",
    icon: "🛡️",
    subtitle: "Policy review · exclusion exposure",
    categories: ["Coverage Summary", "Identified Gaps", "Exclusions Triggered", "Endorsement Options", "Exposure If Unaddressed"],
    systemPrompt: "You are a policy review and coverage-gap analyst. Analyze the provided policy review data and determine: (1) a plain-language summary of what is and is not covered, (2) specific coverage gaps relative to the insured's actual risk profile, (3) which exclusions are most likely to be triggered by a plausible loss scenario, (4) available endorsements, riders, or policy changes that would close the gap, (5) the financial exposure to the insured if the gap goes unaddressed. Cite specific policy sections or exclusion language where possible.",
    outputs: ["Coverage Summary", "Identified Gaps", "Exclusions Triggered", "Endorsement / Rider Options", "Exposure If Unaddressed"],
    scoreLabel: "Coverage Adequacy Score"
  },

  "dme-claim-rescue": {
    title: "DME CLAIM RESCUE",
    icon: "🦽",
    subtitle: "Durable medical equipment claim recovery",
    categories: ["Medical Necessity", "Coding Accuracy", "Prior Authorization Status", "Denial/Delay Cause", "Resubmission Plan"],
    systemPrompt: "You are a DME (durable medical equipment) claims recovery analyst. Analyze the provided DME claim data and determine: (1) whether medical necessity documentation supports the equipment billed, (2) whether HCPCS/CPT coding matches the equipment and diagnosis, (3) prior authorization status and whether it was obtained, valid, and on file, (4) the specific cause of denial or delay (coding, documentation, authorization, coverage), (5) a concrete resubmission plan including any missing documentation to obtain. Flag anything that suggests upcoding, miscoding, or missing certificate of medical necessity.",
    outputs: ["Medical Necessity Review", "Coding Accuracy Check", "Prior Authorization Status", "Denial/Delay Root Cause", "Resubmission Plan"],
    scoreLabel: "Recovery Probability"
  },

  "ap-aging-recovery": {
    title: "AP AGING RECOVERY",
    icon: "📉",
    subtitle: "Aged payable · vendor exposure recovery",
    categories: ["Aging Breakdown", "Root Cause", "Vendor Risk", "Cash Impact", "Recovery Actions"],
    systemPrompt: "You are an accounts-payable aging recovery analyst for an insurance operation. Analyze the provided AP aging data and determine: (1) the aging breakdown by bucket (current, 30/60/90/120+ days) and which items are driving the tail, (2) the likely root cause of the aging (processing delay, dispute, missing documentation, system issue), (3) vendor relationship or contractual risk from the aging (late fees, service interruption, credit hold), (4) the cash-flow impact of the aged balance, (5) concrete recovery actions ranked by impact ordered to clear the aging fastest.",
    outputs: ["Aging Breakdown", "Root Cause Analysis", "Vendor Risk", "Cash Impact", "Ranked Recovery Actions"],
    scoreLabel: "AP Health Score"
  },

  "era-reconciliation": {
    title: "ERA RECONCILIATION",
    icon: "🔄",
    subtitle: "Electronic remittance batch reconciliation",
    categories: ["Batch Summary", "Payment/Adjustment Variance", "Denial Codes Present", "Reconciliation Gaps", "Posting Recommendations"],
    systemPrompt: "You are an ERA (Electronic Remittance Advice) reconciliation analyst. Analyze the provided ERA batch data and determine: (1) a summary of the batch (total claims, total paid, total adjusted), (2) variances between expected and actual payment/adjustment amounts, (3) denial or adjustment reason codes (CARC/RARC) present and what they mean, (4) specific gaps between the ERA and the underlying claims/ledger that need reconciliation, (5) posting recommendations to close out the batch cleanly. Flag any systemic pattern (e.g. a recurring denial code) rather than treating each line as isolated.",
    outputs: ["Batch Summary", "Payment/Adjustment Variance", "Denial Codes Present", "Reconciliation Gaps", "Posting Recommendations"],
    scoreLabel: "Reconciliation Accuracy Score"
  },

  "underwriting-risk-rescue": {
    title: "UNDERWRITING RISK RESCUE",
    icon: "📋",
    subtitle: "Underwriting file risk triage",
    categories: ["Risk Profile Summary", "Red Flags", "Rating Impact", "Referral/Decline Basis", "Mitigation Options"],
    systemPrompt: "You are a senior underwriting risk analyst. Analyze the provided underwriting file data and determine: (1) a summary of the applicant/risk profile, (2) specific red flags (loss history, financial distress, misrepresentation indicators, hazard concentration), (3) the impact of those red flags on rating/pricing, (4) whether the file warrants a referral, decline, or conditional acceptance and the basis for that call, (5) mitigation options (exclusions, higher deductible, loss-control requirements) that could make the risk acceptable. Be specific and avoid restating raw data without interpretation.",
    outputs: ["Risk Profile Summary", "Red Flags", "Rating Impact", "Referral/Decline Basis", "Mitigation Options"],
    scoreLabel: "Underwriting Risk Score"
  },

  "compliance-audit-rescue": {
    title: "COMPLIANCE AUDIT RESCUE",
    icon: "⚖️",
    subtitle: "Regulatory compliance gap remediation",
    categories: ["Compliance Gaps", "Regulatory Basis", "Severity", "Remediation Steps", "Reporting Obligations"],
    systemPrompt: "You are an insurance regulatory compliance analyst. Analyze the provided compliance data and determine: (1) specific compliance gaps identified, (2) the regulatory basis for each gap (state insurance code, NAIC model act, market conduct standard, privacy/data rule), (3) the severity of each gap (self-correctable, market-conduct-exam risk, mandatory reporting trigger), (4) concrete remediation steps in priority order, (5) any regulatory reporting or disclosure obligations triggered by the gap and their deadlines. Cite the specific rule or statute category rather than describing it generically.",
    outputs: ["Compliance Gaps", "Regulatory Basis", "Severity Assessment", "Remediation Steps", "Reporting Obligations"],
    scoreLabel: "Compliance Risk Score"
  },

  "ce-renewal-rescue": {
    title: "CE RENEWAL RESCUE",
    icon: "🎓",
    subtitle: "Continuing education / license renewal triage",
    categories: ["Renewal Status", "CE Credit Gap", "Deadline Risk", "State Requirements", "Completion Plan"],
    systemPrompt: "You are a licensing and continuing-education compliance analyst. Analyze the provided CE renewal data and determine: (1) the licensee's current renewal status, (2) the gap between completed CE credits and the required credits (including any required ethics or state-specific hours), (3) how much time remains before the license lapses and the risk of lapse, (4) state-specific requirements that must be met (course type, reporting timelines), (5) a concrete completion plan to close the gap before the deadline. Flag any license already lapsed or at imminent risk.",
    outputs: ["Renewal Status", "CE Credit Gap", "Deadline Risk", "State Requirements", "Completion Plan"],
    scoreLabel: "Renewal Readiness Score"
  },

  "insurance-fraud-investigation": {
    title: "FRAUD INVESTIGATION RESCUE",
    icon: "🚨",
    subtitle: "Fraud indicator escalation · SIU referral prep",
    categories: ["Fraud Indicators", "Pattern Analysis", "SIU Referral Basis", "Evidence to Preserve", "Financial Exposure"],
    systemPrompt: "You are a senior Special Investigations Unit (SIU) analyst. Analyze the provided claims/relay data for fraud indicators and determine: (1) each specific fraud indicator present (staged loss patterns, inconsistent statements, provider billing anomalies, duplicate claims, timing red flags), (2) whether these indicators form a coherent pattern consistent with fraud versus isolated anomalies, (3) whether the file meets the threshold for a formal SIU referral and the basis for that call, (4) specific evidence that must be preserved (recorded statements, medical records, billing records, surveillance) before further claim handling, (5) the financial exposure if the suspected fraud is not investigated. Be precise and avoid overstating certainty -- distinguish between confirmed indicators and suspicion requiring investigation.",
    outputs: ["Fraud Indicators", "Pattern Analysis", "SIU Referral Basis", "Evidence to Preserve", "Financial Exposure"],
    scoreLabel: "Fraud Likelihood Score",
    isExecutive: true
  }

};

// Export for use in pack-engine.html
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TSM_PACK_CONFIGS;
}