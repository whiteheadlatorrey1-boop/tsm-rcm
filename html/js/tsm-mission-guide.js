/**
 * TSM Mission Guide v5.0 — Multi-Vertical · Full Feature Merge
 * Auto-detects vertical from URL · Domain-aware AI prompts · All war rooms
 * Triggers: engine completion · Anomaly Advisor relay · EU anomaly click
 * Merged: v3.0 (insurance depth) + v4.0 (multi-vertical) + fixes
 */

(function () {
  'use strict';

  const PANEL_ID    = 'tsm-mission-guide-panel';
  const STORAGE_KEY = 'TSM_MISSION_GUIDE';
  const RELAY_KEYS  = [
    'TSM_ANOMALY_RELAY','TSM_INS_ANOMALY','TSM_HC_ANOMALY',
    'TSM_RE_ANOMALY','TSM_LEGAL_ANOMALY','TSM_CONSTRUCTION_ANOMALY',
    'TSM_FINOPS_ANOMALY','TSM_BPO_ANOMALY'
  ];

  // ── Vertical detection ─────────────────────────────────────────────────────
  const VERTICALS = {
    insurance:    { label:'Insurance',    api:'/api/insurance/query',    color:'#00c8ff' },
    hc:           { label:'Healthcare',   api:'/api/hc/query',           color:'#00c8ff' },
    legal:        { label:'Legal',        api:'/api/legal/query',        color:'#b56cff' },
    finops:       { label:'FinOps',       api:'/api/finops/query',       color:'#ffd700' },
    construction: { label:'Construction', api:'/api/construction/query', color:'#ff9500' },
    re:           { label:'Real Estate',  api:'/api/re/query',           color:'#00c864' },
    bpo:          { label:'BPO',          api:'/api/hc/query',           color:'#00c8ff' },
  };

  function detectVertical() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('insurance'))    return 'insurance';
    if (path.includes('/hc') || path.includes('healthcare') || path.includes('denial')) return 'hc';
    if (path.includes('legal'))        return 'legal';
    if (path.includes('finops'))       return 'finops';
    if (path.includes('construction')) return 'construction';
    if (path.includes('/re') || path.includes('real-estate') || path.includes('reo')) return 're';
    if (path.includes('bpo'))          return 'bpo';
    return 'hc';
  }

  function getVertical() {
    const key = detectVertical();
    return { key, ...VERTICALS[key] };
  }

  // ── Domain intel per vertical ──────────────────────────────────────────────
  // Insurance & HC share the richest denial code map (from v3.0)
  const DENIAL_INTEL = {
    'CO-5':  { reason:'Procedure inconsistent with place of service',    missingDocs:'CMN, W-9, Prior Authorization',                  appealTeam:'Authorization & Billing Team',  appealPath:'Submit corrected claim with CMN + prior auth within 120 days', urgency:'HIGH'   },
    'CO-4':  { reason:'Service inconsistent with covered benefit',       missingDocs:'Medical necessity letter, Physician order',       appealTeam:'Clinical Appeals Team',         appealPath:'Submit medical necessity letter from ordering physician',       urgency:'MEDIUM' },
    'CO-16': { reason:'Claim lacks required information',                missingDocs:'Missing modifier, NPI/taxonomy correction',       appealTeam:'Billing Corrections Team',      appealPath:'Correct and resubmit — no formal appeal needed',               urgency:'LOW'    },
    'CO-22': { reason:'Covered by another payer per COB',                missingDocs:'COB form, Secondary payer EOB, Insurance verify', appealTeam:'COB/Eligibility Team',          appealPath:'Verify payer order and resubmit with COB documentation',       urgency:'MEDIUM' },
    'CO-97': { reason:'Bundled service included in another service',     missingDocs:'Modifier 59 documentation, Operative report',    appealTeam:'Coding & Compliance Team',      appealPath:'Apply correct NCCI modifier and resubmit',                     urgency:'MEDIUM' },
    'PR-96': { reason:'Non-covered charge — patient responsibility',     missingDocs:'ABN signed form, Patient consent',               appealTeam:'Patient Financial Services',    appealPath:'Verify ABN signature. Issue patient statement',                urgency:'HIGH'   },
    'CO-50': { reason:'Non-covered service — not deemed medical nec.',   missingDocs:'Medical necessity documentation, Physician letter',appealTeam:'Clinical Appeals Team',       appealPath:'Submit clinical notes + medical necessity letter',             urgency:'HIGH'   },
    'CO-29': { reason:'Timely filing limit expired',                     missingDocs:'Proof of timely filing, EOB from primary',        appealTeam:'Appeals & Escalations Team',   appealPath:'Submit proof of timely filing within 30 days of denial',       urgency:'HIGH'   },
  };

  const DOMAIN_INTEL = {
    insurance: {
      systemRole: 'insurance operations and claims denial management AI',
      anomalyLabel: 'Denial Code',
      usesDenialIntel: true,
      appPool: [
        {
          name: 'Agent Command Center',
          url: '/html/tsm-insurance/agents-ins.html',
          solves: [
            'agent workflow gap','Arizona insurance issue','life insurance anomaly',
            'health insurance gap','accident insurance issue','Medicare plan gap',
            'premium framework error','agent node issue','producer workflow gap',
            'agent licensing issue','policy framework anomaly','Medicare premium issue',
            'agent performance gap','commission discrepancy','agent assignment missing'
          ]
        },
        {
          name: 'AZ Insurance Overview',
          url: '/html/tsm-insurance/az-ins.html',
          solves: [
            'general insurance domain review','multi-line insurance issue','cross-domain anomaly',
            'insurance portfolio gap','multi-product overlap','insurance domain classification needed',
            'coverage type unclear','insurance line mismatch','policy domain unknown',
            'multi-carrier issue','insurance overview needed','product line confusion',
            'insurance landscape review','carrier comparison needed'
          ]
        },
        {
          name: 'DME Services',
          url: '/html/tsm-insurance/dme.html',
          solves: [
            'DME claim denied','durable medical equipment issue','CMN missing',
            'DME prior auth not documented','equipment coverage gap','DME billing error',
            'CO-5 denial on DME','DME supplier issue','HCPCS code mismatch',
            'DME medical necessity missing','equipment rental dispute','DME modifier error',
            'DME payer rejection','DME documentation gap','oxygen equipment claim'
          ]
        },
        {
          name: 'Anomaly Advisor',
          url: '/html/tsm-insurance/ins-anomaly-advisor.html',
          solves: [
            'anomaly scenario review','denial pattern analysis','claim anomaly walkthrough',
            'insurance scenario simulation','anomaly classification needed','risk scenario analysis',
            'denial scenario training','anomaly intelligence needed','pattern recognition gap',
            'scenario-based anomaly review','claim behavior anomaly','outlier detection needed'
          ]
        },
        {
          name: 'Insurance Appeals',
          url: '/html/tsm-insurance/ins-appeals.html',
          solves: [
            'appeal needed','denial appeal','CO-5 appeal','CO-4 appeal','CO-29 appeal',
            'CO-50 appeal','PR-96 appeal','timely filing appeal','medical necessity appeal',
            'prior auth appeal','appeal letter missing','appeal deadline at risk',
            'appeal documentation gap','second level appeal','external review needed',
            'appeal response overdue','reconsideration request','grievance filing'
          ]
        },
        {
          name: 'Insurance Claims',
          url: '/html/tsm-insurance/ins-claims.html',
          solves: [
            'claim submission error','claim status unknown','claim not filed',
            'duplicate claim','clearinghouse rejection','payer ID mismatch',
            'claim resubmission needed','CO-16 denial','missing modifier',
            'claim edit error','claim scrubbing failure','EOB discrepancy',
            'claim underpayment','coordination of benefits issue','COB conflict',
            'claim adjustment needed','remittance mismatch','ERA posting error'
          ]
        },
        {
          name: 'Insurance Compliance',
          url: '/html/tsm-insurance/ins-compliance.html',
          solves: [
            'compliance violation','regulatory non-compliance','DOI requirement missing',
            'insurance audit finding','policy compliance gap','filing requirement missed',
            'state mandate gap','CE credit missing','license renewal overdue',
            'compliance report needed','regulatory filing missing','market conduct issue',
            'suitability violation','disclosure requirement gap','HIPAA violation'
          ]
        },
        {
          name: 'Insurance Intel',
          url: '/html/tsm-insurance/ins-intel.html',
          solves: [
            'intelligence review needed','market intel gap','payer behavior analysis',
            'denial trend analysis','carrier intel missing','payer policy change',
            'reimbursement rate shift','network status change','payer contract gap',
            'insurance market analysis','competitive intel needed','payer mix analysis',
            'denial pattern intelligence','claim trend anomaly','risk intelligence gap'
          ]
        },
        {
          name: 'Liability',
          url: '/html/tsm-insurance/ins-liability.html',
          solves: [
            'liability claim','general liability issue','liability coverage gap',
            'liability exposure','third party claim','bodily injury claim',
            'property damage claim','liability dispute','coverage limit issue',
            'liability documentation missing','indemnification gap','subrogation issue',
            'liability reserve inadequate','occurrence vs claims-made gap','liability audit'
          ]
        },
        {
          name: 'Malpractice',
          url: '/html/tsm-insurance/ins-malpractice.html',
          solves: [
            'malpractice claim','professional liability issue','E&O gap',
            'malpractice coverage missing','professional negligence claim','tail coverage gap',
            'malpractice documentation missing','claims-made policy issue','prior acts gap',
            'malpractice reserve issue','professional liability audit','E&O exclusion issue',
            'malpractice incident report missing','risk management gap'
          ]
        },
        {
          name: 'Underwriting',
          url: '/html/tsm-insurance/ins-underwriting.html',
          solves: [
            'underwriting gap','risk assessment missing','policy issuance error',
            'underwriting documentation incomplete','risk classification error',
            'premium calculation gap','underwriting approval missing','policy binding issue',
            'risk appetite mismatch','underwriting criteria not met','policy exclusion gap',
            'underwriting audit finding','coverage issuance delay','rating factor error',
            'underwriting referral needed','policy amendment gap'
          ]
        },
      ],
    },
    hc: {
      systemRole: 'healthcare RCM and medical billing AI',
      anomalyLabel: 'Denial Code',
      usesDenialIntel: true,
      appPool: [
        {
          name: 'HC Anomaly Advisor',
          url: '/html/healthcare/hc-anomaly-advisor.html',
          solves: [
            'anomaly scenario review','denial pattern analysis','claim anomaly walkthrough',
            'healthcare scenario simulation','anomaly classification needed','risk scenario analysis',
            'denial scenario training','anomaly intelligence needed','pattern recognition gap',
            'scenario-based anomaly review','claim behavior anomaly','outlier detection needed',
            'RCM anomaly diagnosis','billing anomaly pattern','coding anomaly review'
          ]
        },
        {
          name: 'HC Billing',
          url: '/html/healthcare/hc-billing/index.html',
          solves: [
            'claim denial','billing error','coding mismatch','CPT code error','ICD-10 error',
            'modifier missing','prior auth not documented','charge capture gap',
            'claim submission error','clearinghouse rejection','payer ID mismatch',
            'CO-5 denial','CO-4 denial','CO-16 denial','CO-22 denial','CO-97 denial',
            'PR-96 denial','CO-50 denial','CO-29 denial','timely filing','bundling error',
            'claim resubmission needed','EOB discrepancy','remittance mismatch',
            'claim underpayment','ERA posting error','claim edit error'
          ]
        },
        {
          name: 'HC Compliance',
          url: '/html/healthcare/hc-compliance.html',
          solves: [
            'HIPAA violation','compliance audit finding','regulatory non-compliance',
            'CMS requirement missing','OIG risk flag','compliance policy gap',
            'healthcare regulation breach','compliance report needed','STARK law issue',
            'Anti-Kickback concern','credential compliance gap','accreditation issue',
            'compliance training missing','quality reporting gap','OSHA healthcare violation'
          ]
        },
        {
          name: 'HC Financial',
          url: '/html/healthcare/hc-financial.html',
          solves: [
            'AR aging issue','revenue cycle gap','cash flow anomaly','budget variance',
            'cost report issue','financial statement error','payer mix analysis needed',
            'net revenue discrepancy','contractual adjustment error','bad debt gap',
            'financial performance anomaly','reimbursement rate issue','write-off gap',
            'collection rate drop','days in AR elevated','financial audit finding'
          ]
        },
        {
          name: 'HC Grants',
          url: '/html/healthcare/hc-grants.html',
          solves: [
            'grant documentation missing','grant compliance gap','funding report missing',
            'grant milestone not met','grant application gap','federal funding issue',
            'grant reporting requirement','grant audit finding','grant expenditure gap',
            'grant period close issue','grant allocation error','funding source mismatch',
            'grant drawdown issue','grant renewal gap','sub-recipient monitoring gap'
          ]
        },
        {
          name: 'HC Insurance',
          url: '/html/healthcare/hc-insurance.html',
          solves: [
            'insurance verification gap','eligibility issue','coverage not verified',
            'payer enrollment missing','insurance authorization gap','COB conflict',
            'secondary insurance not filed','insurance plan mismatch','benefit verification gap',
            'network status unknown','out of network issue','insurance policy gap',
            'enrollment error','credentialing gap','payer contract issue'
          ]
        },
        {
          name: 'HC Legal',
          url: '/html/healthcare/hc-legal.html',
          solves: [
            'legal compliance gap','healthcare contract issue','patient rights violation',
            'legal hold missing','litigation risk','malpractice documentation gap',
            'consent form missing','legal filing missing','healthcare regulation legal gap',
            'contract clause anomaly','legal deadline risk','legal review needed',
            'BAA missing','business associate agreement gap','legal escalation needed'
          ]
        },
        {
          name: 'HC Medical',
          url: '/html/healthcare/hc-medical.html',
          solves: [
            'medical necessity missing','clinical documentation gap','physician order missing',
            'medical record incomplete','clinical note gap','diagnosis not supported',
            'procedure not documented','medical coding gap','clinical criteria not met',
            'medical review needed','physician sign-off missing','clinical pathway gap',
            'treatment plan missing','medical decision making gap','clinical escalation needed'
          ]
        },
        {
          name: 'HC Operations',
          url: '/html/healthcare/hc-operations.html',
          solves: [
            'daily operations gap','workflow bottleneck','staffing shortage',
            'scheduling anomaly','capacity issue','operational KPI miss',
            'patient flow gap','department coordination failure','operational report missing',
            'SLA breach','throughput issue','operational cost overrun',
            'resource allocation gap','shift coverage missing','ops escalation needed'
          ]
        },
        {
          name: 'HC Pharmacy',
          url: '/html/healthcare/hc-pharmacy.html',
          solves: [
            'pharmacy claim denied','drug authorization missing','formulary issue',
            'prior auth for medication missing','NDC code error','pharmacy billing gap',
            'medication not covered','step therapy requirement','pharmacy benefit gap',
            'drug interaction documentation','controlled substance documentation gap',
            'pharmacy compliance issue','prescription not filled','specialty drug issue',
            'pharmacy reconciliation gap','medication dispensing error'
          ]
        },
        {
          name: 'Legal Intelligence',
          url: '/html/legal-pro/legal-analyst-pro.html',
          solves: [
            'legal intelligence gap','matter portfolio review','legal risk assessment',
            'contract analysis needed','legal document review','clause extraction',
            'legal pattern analysis','regulatory legal gap','legal research needed',
            'legal landscape review','matter classification needed','legal anomaly diagnosis',
            'legal due diligence gap','legal intelligence report','overall legal review'
          ]
        },
        {
          name: 'Case Strategist',
          url: '/html/legal-pro/case-strategist.html',
          solves: [
            'case filing gap','court filing missing','filing deadline at risk',
            'case strategy needed','matter escalation','pleading not filed',
            'motion missing','discovery deadline risk','case status unknown',
            'legal hold missing','litigation strategy gap','case brief missing',
            'deposition not scheduled','evidence gap','court order missing',
            'case chronology gap','trial prep gap','settlement documentation missing',
            'judgment not documented','case closure gap','docket management issue'
          ]
        },
        {
          name: 'Legal BPO',
          url: '/html/legal-pro/bpo-legal.html',
          solves: [
            'legal BPO workflow gap','outsourced legal task issue','legal process outsourcing gap',
            'contract review backlog','document review queue','legal support gap',
            'legal staffing issue','paralegal workflow gap','legal intake gap',
            'contract abstraction missing','legal data entry error','legal BPO SLA breach',
            'legal process bottleneck','outsourced compliance gap','legal vendor issue'
          ]
        },
      ],
    },
    finops: {
      systemRole: 'financial operations and AP/AR management AI',
      anomalyLabel: 'Variance Type',
      usesDenialIntel: false,
      appPool: [
        {
          name: 'FinOps Strategist',
          url: '/html/finops-suite/finops-main-strategist.html',
          solves: [
            'BNCA decision needed','next course of action unclear','multi-anomaly synthesis',
            'financial risk escalation','strategic financial review','executive decision required',
            'cross-file data relay','war room escalation','financial recovery strategy',
            'root cause analysis','senior review needed','project financial briefing',
            'stakeholder escalation','remediation plan needed','financial pattern analysis'
          ]
        },
        {
          name: 'Document Analysis',
          url: '/html/finops-suite/doc-analysis-tab.html',
          solves: [
            'document extraction needed','financial document gap','invoice extraction',
            'contract clause analysis','statement parsing','remittance document missing',
            'purchase order analysis','vendor document review','AP document missing',
            'financial record extraction','document intelligence','PDF financial analysis',
            'EOB extraction','payment document gap','supporting documentation missing'
          ]
        },
        {
          name: 'FinOps Accounting',
          url: '/html/finops-suite/finops-accounting.html',
          solves: [
            'accounting error','journal entry error','GAAP compliance gap',
            'reconciliation failure','trial balance discrepancy','general ledger error',
            'accounts payable mismatch','accounts receivable gap','month-end close issue',
            'accrual error','depreciation miscalculation','chart of accounts mismatch',
            'financial statement error','balance sheet discrepancy','audit finding',
            'bookkeeping gap','cost allocation error','intercompany transaction issue'
          ]
        },
        {
          name: 'FinOps Operations',
          url: '/html/finops-suite/finops-operations.html',
          solves: [
            'daily operations gap','cash flow issue','budget variance','invoice not paid',
            'payment delayed','AP aging issue','AR aging issue','vendor payment dispute',
            'operational cost overrun','spend analysis needed','purchase order mismatch',
            'expense report anomaly','duplicate payment','missing payment approval',
            'financial workflow bottleneck','SLA breach on payment','operational KPI gap',
            'daily financial report missing','treasury gap','working capital issue'
          ]
        },
        {
          name: 'Tax Prep',
          url: '/html/finops-suite/tax.html',
          solves: [
            'tax filing gap','W-9 missing','1099 not issued','tax document incomplete',
            'tax liability undocumented','year-end tax prep','tax compliance issue',
            'contractor tax classification','IRS reporting gap','sales tax error',
            'use tax undocumented','tax audit risk','estimated tax payment missing',
            'deduction documentation gap','tax return preparation','entity tax classification'
          ]
        },
        {
          name: 'Zero Trust',
          url: '/html/finops-suite/zero-trust.html',
          solves: [
            'user access issue','unauthorized access','user management gap',
            'permission error','role assignment missing','access control failure',
            'user provisioning gap','authentication issue','security policy violation',
            'credential anomaly','user offboarding incomplete','access audit needed',
            'privileged access risk','identity verification gap','login anomaly'
          ]
        },
        {
          name: 'FinOps Compliance',
          url: '/html/finops-suite/compliance.html',
          solves: [
            'compliance violation','regulatory non-compliance','SOX gap',
            'financial audit finding','internal control failure','policy violation',
            'compliance report needed','regulatory filing missing','AML flag',
            'KYC gap','GAAP violation','financial regulation breach',
            'reporting requirement missed','compliance risk flag','external audit issue',
            'fiduciary duty gap','disclosure requirement missing'
          ]
        },
      ],
    },
    construction: {
      systemRole: 'construction project management and defect resolution AI',
      anomalyLabel: 'Defect Type',
      usesDenialIntel: false,
      appPool: [
        {
          name: 'Field & Document Ops',
          url: '/html/construction-suite/construction-suite-expansion.html',
          solves: [
            'missing RFI','RFI not filed','RFI response overdue','change order pending','change order not documented',
            'field service gap','site condition undocumented','daily field report missing','superintendent log incomplete',
            'punch list item','punch list not closed','inspection not scheduled','subcontractor non-compliance',
            'work order missing','site visit not logged','field defect unreported','crew assignment gap',
            'schedule deviation','phase milestone missed','scope change not captured'
          ]
        },
        {
          name: 'Document Showcase',
          url: '/html/construction-suite/document-showcase.html',
          solves: [
            'document extraction needed','contract document gap','drawing discrepancy','spec compliance failure',
            'submittal missing','submittal package incomplete','cure documentation not uploaded',
            'material certification missing','test report not filed','as-built missing',
            'inspection sign-off missing','structural defect documentation','permit documentation gap',
            'document analysis required','clause extraction','document intelligence','PDF extraction'
          ]
        },
        {
          name: 'Construction Financial',
          url: '/html/construction-suite/financial.html',
          solves: [
            'invoice discrepancy','invoice not paid','billing gap','payment application missing',
            'retainage issue','cost overrun','budget variance','subcontractor invoice dispute',
            'lien waiver missing','AIA billing error','schedule of values mismatch',
            'contractor payment delayed','financial exposure','overpayment','underpayment',
            'draw request incomplete','cost code mismatch','job cost variance'
          ]
        },
        {
          name: 'Tax Prep',
          url: '/html/construction-suite/tax-prep.html',
          solves: [
            'tax filing gap','W-9 missing','1099 not issued','tax document incomplete',
            'contractor tax classification','tax liability undocumented','year-end tax prep',
            'tax compliance issue','subcontractor tax form missing','IRS reporting gap',
            'sales tax on materials','use tax undocumented','tax audit risk'
          ]
        },
        {
          name: 'Permits & Proposals',
          url: '/html/construction-suite/permits-proposals.html',
          solves: [
            'permit missing','permit not pulled','permit expired','permit application gap',
            'building permit violation','proposal not generated','bid document missing',
            'proposal gap','scope of work undefined','RFP response missing',
            'zoning issue','certificate of occupancy missing','inspection permit required',
            'proposal revision needed','contract not executed','pre-construction checklist gap'
          ]
        },
        {
          name: 'Construction Pro',
          url: '/html/construction-suite/construction-pro.html',
          solves: [
            'module analysis needed','playbook required','intelligence report missing',
            'multi-issue analysis','cross-module review','custom report needed',
            'combined output required','pattern analysis across documents',
            'strategic intelligence feed','category filter analysis','report history gap',
            'export needed','saved output review','comprehensive project audit'
          ]
        },
        {
          name: 'Compliance',
          url: '/html/construction-suite/compliance.html',
          solves: [
            'compliance violation','OSHA issue','safety gap','regulatory non-compliance',
            'compliance audit finding','code violation','AHJ requirement missing',
            'safety inspection failed','hazmat documentation missing','environmental compliance gap',
            'labor law violation','prevailing wage issue','certified payroll missing',
            'insurance certificate expired','bonding gap','licensing issue','compliance report needed'
          ]
        },
        {
          name: 'Construction Strategist',
          url: '/html/construction-suite/construction-strategist.html',
          solves: [
            'escalation to strategist','next course of action needed','multi-anomaly synthesis',
            'project risk summary','executive decision required','strategic review',
            'cross-file data relay','war room escalation','senior review needed',
            'project status briefing','stakeholder escalation','remediation plan needed',
            'root cause analysis','project recovery strategy','owner communication required'
          ]
        },
      ],
    },
    re: {
      systemRole: 'real estate transaction and document analysis AI',
      anomalyLabel: 'Document Issue',
      usesDenialIntel: false,
      appPool: [
        {
          name: 'RealtyOps AI',
          url: '/html/reo-pro/index.html',
          solves: [
            'real estate intelligence needed','property transaction anomaly','listing document gap',
            'title issue','deed discrepancy','lien not found','easement undocumented',
            'survey missing','closing document gap','HOA document missing',
            'inspection report not filed','disclosure gap','appraisal discrepancy',
            'MLS data mismatch','property valuation gap','buyer qualification issue',
            'offer document missing','escrow anomaly','real estate compliance gap',
            'property management issue','lease agreement gap','rental income discrepancy',
            'asset classification error','portfolio gap','real estate risk flag'
          ]
        },
        {
          name: 'RE Guide',
          url: '/html/reo-pro/re-guide.html',
          solves: [
            'navigation guidance needed','workflow walkthrough required','app onboarding gap',
            'process overview needed','how-to reference','staff training on RE ops',
            'new user orientation','RE workflow unclear','process documentation gap',
            'step-by-step guidance needed','RE procedure reference'
          ]
        },
        {
          name: 'FinOps Accounting',
          url: '/html/finops-suite/finops-accounting.html',
          solves: [
            'accounting error','journal entry error','GAAP compliance gap',
            'reconciliation failure','general ledger error','accounts payable mismatch',
            'accounts receivable gap','month-end close issue','accrual error',
            'depreciation miscalculation','financial statement error','balance sheet discrepancy',
            'audit finding','bookkeeping gap','cost allocation error','intercompany transaction issue'
          ]
        },
        {
          name: 'FinOps Operations',
          url: '/html/finops-suite/finops-operations.html',
          solves: [
            'daily operations gap','cash flow issue','budget variance','invoice not paid',
            'payment delayed','AP aging issue','AR aging issue','vendor payment dispute',
            'operational cost overrun','duplicate payment','missing payment approval',
            'financial workflow bottleneck','daily financial report missing',
            'treasury gap','working capital issue','expense report anomaly'
          ]
        },
        {
          name: 'FinOps Compliance',
          url: '/html/finops-suite/compliance.html',
          solves: [
            'compliance violation','regulatory non-compliance','SOX gap',
            'financial audit finding','internal control failure','policy violation',
            'compliance report needed','regulatory filing missing','AML flag',
            'KYC gap','GAAP violation','financial regulation breach',
            'reporting requirement missed','fiduciary duty gap','disclosure requirement missing'
          ]
        },
        {
          name: 'Legal BPO',
          url: '/html/bpo/legal-bpo.html',
          solves: [
            'legal document gap','contract issue','case file missing','legal compliance gap',
            'matter escalation','legal hold missing','discovery gap','filing missing',
            'contract clause anomaly','legal deadline risk','legal review needed',
            'title legal dispute','deed legal issue','easement legal gap','zoning legal issue'
          ]
        },
        {
          name: 'Tax Prep',
          url: '/html/finops-suite/tax.html',
          solves: [
            'tax document missing','W-9 gap','1099 not issued','tax filing issue',
            'tax compliance anomaly','property tax gap','real estate tax issue',
            'capital gains documentation missing','tax liability undocumented',
            'year-end tax prep gap','tax audit risk','1031 exchange documentation',
            'depreciation schedule missing','cost basis error','tax return gap'
          ]
        },
      ],
    },
    bpo: {
      systemRole: 'BPO operations and workflow management AI',
      anomalyLabel: 'Workflow Issue',
      usesDenialIntel: false,
      appPool: [
        {
          name: 'BPO Services Pro',
          url: '/html/bpo/services-pro.html',
          solves: [
            'revenue recovery needed','queue ops issue','AI analyst review required',
            'strategist relay needed','BPO service gap','revenue leakage',
            'queue backlog','ops performance anomaly','service delivery failure',
            'BPO workflow breakdown','analyst escalation','recovery strategy needed',
            'multi-service coordination gap','BPO KPI miss','service level failure'
          ]
        },
        {
          name: 'BPO Document Uploader',
          url: '/html/bpo/bpo-doc-uploader.html',
          solves: [
            'document not uploaded','document classification needed','file routing gap',
            'document intake missing','upload stage incomplete','chain not initiated',
            'document not classified','file not routed to war room','stage 01 gap',
            'document relay missing','BPO pipeline not started','intake error',
            'document submission gap','file processing not started'
          ]
        },
        {
          name: 'BPO Competitive Playbook',
          url: '/html/bpo/tsm-bpo-competitive-playbook.html',
          solves: [
            'BPO service scenario','competitive displacement risk','client objection',
            'pricing challenge','contract renewal at risk','win/loss analysis needed',
            'market positioning gap','BPO scenario analysis','service comparison needed',
            'vendor evaluation','outsourcing decision','BPO strategy gap',
            'competitive intelligence needed','proposal counter needed','RFP response gap'
          ]
        },
        {
          name: 'BPO Scenarios',
          url: '/html/bpo/bpo-scenarios-demo.html',
          solves: [
            'scenario walkthrough needed','BPO demo required','use case simulation',
            'workflow scenario gap','process demonstration needed','staff training scenario',
            'onboarding simulation','client demo needed','scenario-based review',
            'BPO process illustration','workflow modeling','case scenario analysis'
          ]
        },
        {
          name: 'Real Estate BPO',
          url: '/html/bpo/realty-bpo.html',
          solves: [
            'real estate document issue','property transaction gap','title anomaly',
            'deed discrepancy','lease document missing','property valuation gap',
            'real estate compliance issue','HOA document missing','closing document gap',
            'real estate BPO workflow','property management issue','listing document error'
          ]
        },
        {
          name: 'Tax BPO',
          url: '/html/bpo/tax-bpo.html',
          solves: [
            'tax document missing','W-9 gap','1099 not issued','tax filing issue',
            'tax compliance anomaly','contractor tax classification','IRS reporting gap',
            'tax liability undocumented','tax audit risk','year-end tax prep gap',
            'sales tax error','deduction documentation missing','tax return gap'
          ]
        },
        {
          name: 'Legal BPO',
          url: '/html/bpo/legal-bpo.html',
          solves: [
            'legal document gap','contract issue','case file missing','legal compliance gap',
            'matter escalation','legal hold missing','discovery gap','filing missing',
            'contract clause anomaly','legal deadline risk','counsel assignment gap',
            'legal workflow issue','regulatory legal gap','legal review needed'
          ]
        },
        {
          name: 'Insurance BPO',
          url: '/html/bpo/insurance-bpo.html',
          solves: [
            'insurance claim gap','policy document missing','claim denial',
            'prior auth not documented','COB conflict','eligibility issue',
            'insurance compliance gap','coverage verification missing','payer mismatch',
            'insurance workflow issue','claim submission error','EOB discrepancy'
          ]
        },
        {
          name: 'Healthcare BPO',
          url: '/html/bpo/healthcare-bpo.html',
          solves: [
            'healthcare claim denial','billing error','coding mismatch',
            'prior auth missing','AR aging issue','remittance discrepancy',
            'EOB mismatch','underpayment','charge capture gap','patient balance error',
            'healthcare compliance gap','RCM workflow issue','denial recovery needed'
          ]
        },
        {
          name: 'FinOps BPO',
          url: '/html/bpo/finops-bpo.html',
          solves: [
            'financial document gap','invoice discrepancy','payment delayed',
            'AP aging issue','budget variance','cost overrun','cash flow anomaly',
            'vendor payment dispute','duplicate payment','expense anomaly',
            'financial compliance gap','reconciliation failure','financial workflow issue'
          ]
        },
        {
          name: 'Construction BPO',
          url: '/html/bpo/construction-bpo.html',
          solves: [
            'construction document gap','RFI missing','change order issue',
            'submittal missing','permit gap','compliance violation','defect unreported',
            'subcontractor issue','punch list gap','inspection sign-off missing',
            'construction billing issue','lien waiver missing','job cost variance'
          ]
        },
      ],
    },
  };

  function extractCode(text) {
    const m = (text || '').match(/\b(CO-\d+|PR-\d+|OA-\d+|PI-\d+)\b/i);
    return m ? m[1].toUpperCase() : null;
  }

  // ── Persistence ────────────────────────────────────────────────────────────
  function loadMission() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch { return null; }
  }
  function saveMission(m) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); }
    catch {}
  }

  // ── Panel injection ────────────────────────────────────────────────────────
  function ensurePanel() {
    if (document.getElementById(PANEL_ID)) return;
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `<div id="tmg-inner"></div>`;
    document.body.appendChild(panel);
    injectStyles();
  }

  function injectStyles() {
    if (document.getElementById('tmg-styles')) return;
    const accent = getVertical().color;
    const s = document.createElement('style');
    s.id = 'tmg-styles';
    s.textContent = `
      #tsm-mission-guide-panel {
        position:fixed; bottom:0; right:0; width:400px; max-height:88vh;
        background:#0d0f14; border:1px solid #1e2535; border-bottom:none; border-right:none;
        border-radius:12px 0 0 0; display:flex; flex-direction:column;
        z-index:9999; font-family:'Share Tech Mono','Courier New',monospace;
        box-shadow:-4px -4px 32px rgba(0,200,255,0.08); overflow:hidden;
      }
      #tmg-inner { overflow-y:auto; flex:1; padding:0 0 12px 0; scrollbar-width:thin; scrollbar-color:#1e2535 transparent; }

      /* ── Header ── */
      .tmg-header { display:flex; align-items:center; justify-content:space-between; padding:10px 14px 8px; background:#0a0c10; border-bottom:1px solid #1e2535; position:sticky; top:0; z-index:10; }
      .tmg-header-left { display:flex; align-items:center; gap:8px; }
      .tmg-badge { font-size:9px; letter-spacing:0.12em; color:${accent}; background:${accent}18; border:1px solid ${accent}33; border-radius:4px; padding:2px 6px; text-transform:uppercase; }
      .tmg-title { font-size:11px; color:#e0e8f0; letter-spacing:0.08em; text-transform:uppercase; }
      .tmg-vertical-tag { font-size:9px; letter-spacing:0.1em; color:#3a5060; text-transform:uppercase; }
      .tmg-header-actions { display:flex; gap:6px; }
      .tmg-btn-icon { background:none; border:1px solid #1e2535; border-radius:4px; color:#5a7090; cursor:pointer; font-size:11px; padding:3px 7px; transition:all 0.15s; }
      .tmg-btn-icon:hover { border-color:${accent}; color:${accent}; }

      /* ── Mission meta ── */
      .tmg-meta { padding:10px 14px 8px; border-bottom:1px solid #111620; }
      .tmg-anomaly-badge { display:inline-flex; align-items:center; gap:6px; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; color:#ff6b35; margin-bottom:5px; }
      .tmg-anomaly-dot { width:6px; height:6px; border-radius:50%; background:#ff6b35; animation:tmg-pulse 1.4s infinite; }
      @keyframes tmg-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      .tmg-anomaly-title { font-size:13px; color:#e0e8f0; font-weight:600; margin-bottom:4px; line-height:1.3; }
      .tmg-anomaly-summary { font-size:11px; color:#6a8aaa; line-height:1.5; }
      .tmg-code-tag { display:inline-block; margin-top:6px; font-size:10px; background:rgba(255,107,53,0.1); border:1px solid rgba(255,107,53,0.3); color:#ff6b35; border-radius:3px; padding:1px 6px; letter-spacing:0.08em; }
      /* Appeal routing row — insurance/HC only */
      .tmg-appeal-row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
      .tmg-appeal-chip { font-size:9px; letter-spacing:0.07em; background:rgba(0,200,255,0.06); border:1px solid rgba(0,200,255,0.18); color:#00c8ff; border-radius:3px; padding:2px 7px; }
      .tmg-appeal-chip.urgent { background:rgba(255,107,53,0.08); border-color:rgba(255,107,53,0.3); color:#ff6b35; }

      /* ── Section label ── */
      .tmg-section-label { font-size:9px; letter-spacing:0.15em; text-transform:uppercase; color:#3a5060; padding:10px 14px 5px; }

      /* ── App chips ── */
      .tmg-app-chips { display:flex; flex-wrap:wrap; gap:6px; padding:0 14px 10px; }
      .tmg-chip { display:flex; align-items:center; gap:5px; font-size:10px; color:#8aaac8; background:#111620; border:1px solid #1e2535; border-radius:20px; padding:4px 10px; letter-spacing:0.04em; }

      /* ── TSM vs BPO compare ── */
      .tmg-compare { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:0 14px 10px; }
      .tmg-compare-card { border-radius:6px; padding:10px 10px 8px; font-size:10px; line-height:1.5; }
      .tmg-compare-card.tsm { background:rgba(0,200,100,0.06); border:1px solid rgba(0,200,100,0.18); }
      .tmg-compare-card.bpo { background:rgba(255,80,80,0.05); border:1px solid rgba(255,80,80,0.15); }
      .tmg-compare-label { font-size:9px; letter-spacing:0.12em; text-transform:uppercase; margin-bottom:4px; font-weight:700; }
      .tmg-compare-card.tsm .tmg-compare-label { color:#00c864; }
      .tmg-compare-card.bpo .tmg-compare-label { color:#ff5050; }
      .tmg-compare-body { color:#8aaac8; }

      /* ── Execution steps ── */
      .tmg-steps { padding:0 14px 4px; }
      .tmg-step { display:flex; gap:10px; padding:8px 0; border-bottom:1px solid #0f1520; align-items:flex-start; }
      .tmg-step:last-child { border-bottom:none; }
      .tmg-step-num { width:22px; height:22px; min-width:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; flex-shrink:0; margin-top:1px; }
      .tmg-step.active  .tmg-step-num { background:${accent}; color:#000; }
      .tmg-step.done    .tmg-step-num { background:#00c864; color:#000; }
      .tmg-step.pending .tmg-step-num { background:#1e2535; color:#3a5060; }
      .tmg-step.urgent  .tmg-step-num { background:rgba(255,107,53,0.15); border:1px solid #ff6b35; color:#ff6b35; }
      .tmg-step-body { flex:1; }
      .tmg-step-title { font-size:11px; color:#c0d0e0; font-weight:600; margin-bottom:2px; line-height:1.3; }
      .tmg-step.urgent .tmg-step-title { color:#ff6b35; }
      .tmg-step.done   .tmg-step-title { text-decoration:line-through; color:#3a5060; }
      .tmg-step-instruction { font-size:10px; color:#5a7090; line-height:1.5; margin-bottom:3px; }
      .tmg-step-hint { font-size:9px; color:${accent}; opacity:0.7; font-style:italic; }
      .tmg-step-check { background:none; border:1px solid #1e2535; border-radius:3px; color:#3a5060; cursor:pointer; font-size:9px; padding:2px 5px; margin-top:4px; transition:all 0.15s; letter-spacing:0.06em; }
      .tmg-step-check:hover { border-color:#00c864; color:#00c864; }

      /* ── Ready prompts ── */
      .tmg-prompts { padding:0 14px 4px; display:flex; flex-direction:column; gap:5px; }
      .tmg-prompt-btn { display:flex; align-items:center; gap:7px; background:#0f1520; border:1px solid #1e2535; border-radius:6px; color:#8aaac8; cursor:pointer; font-size:10px; font-family:inherit; padding:7px 10px; text-align:left; transition:all 0.15s; letter-spacing:0.03em; line-height:1.4; }
      .tmg-prompt-btn:hover { border-color:${accent}; color:${accent}; background:${accent}0a; }
      .tmg-prompt-arrow { color:#3a5060; flex-shrink:0; }

      /* ── Progress bar ── */
      .tmg-progress-wrap { padding:6px 14px 0; }
      .tmg-progress-label { display:flex; justify-content:space-between; font-size:9px; color:#3a5060; letter-spacing:0.08em; margin-bottom:4px; text-transform:uppercase; }
      .tmg-progress-bar { height:3px; background:#1e2535; border-radius:2px; overflow:hidden; }
      .tmg-progress-fill { height:100%; background:linear-gradient(90deg,${accent},#00c864); border-radius:2px; transition:width 0.4s ease; }

      /* ── Footer ── */
      .tmg-footer { display:flex; gap:6px; padding:10px 14px 12px; border-top:1px solid #111620; }
      .tmg-footer-btn { flex:1; background:none; border:1px solid #1e2535; border-radius:5px; color:#5a7090; cursor:pointer; font-family:inherit; font-size:10px; letter-spacing:0.08em; padding:7px; text-transform:uppercase; transition:all 0.15s; }
      .tmg-footer-btn:hover { border-color:${accent}; color:${accent}; }
      .tmg-footer-btn.primary { background:${accent}14; border-color:${accent}4d; color:${accent}; }
      .tmg-footer-btn.primary:hover { background:${accent}26; }

      /* ── Loading skeleton ── */
      .tmg-loading { padding:20px 14px; display:flex; flex-direction:column; gap:10px; align-items:center; }
      .tmg-spinner { width:24px; height:24px; border:2px solid #1e2535; border-top-color:${accent}; border-radius:50%; animation:tmg-spin 0.8s linear infinite; }
      @keyframes tmg-spin { to { transform:rotate(360deg) } }
      .tmg-loading-text { font-size:10px; color:#3a5060; letter-spacing:0.1em; text-transform:uppercase; }
      .tmg-skel { height:8px; background:#111620; border-radius:4px; width:100%; animation:tmg-shimmer 1.2s infinite; }
      @keyframes tmg-shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.9} }

      /* ── Empty state ── */
      .tmg-empty { padding:28px 14px; text-align:center; color:#2a3545; font-size:11px; letter-spacing:0.06em; line-height:1.6; }
      .tmg-empty-icon { font-size:28px; margin-bottom:10px; opacity:0.4; }

      /* ── Remediation block ── */
      .tmg-remediation { margin:0 14px 10px; border:1px solid rgba(0,200,100,0.25); border-radius:6px; background:rgba(0,200,100,0.04); overflow:hidden; }
      .tmg-rem-header { display:flex; align-items:center; justify-content:space-between; padding:8px 10px 6px; border-bottom:1px solid rgba(0,200,100,0.12); }
      .tmg-rem-app { font-size:12px; color:#00c864; font-weight:700; letter-spacing:0.06em; }
      .tmg-rem-urgency { font-size:9px; letter-spacing:0.1em; text-transform:uppercase; border-radius:3px; padding:2px 6px; }
      .tmg-rem-urgency.CRITICAL { background:rgba(255,50,50,0.12); border:1px solid rgba(255,50,50,0.3); color:#ff3232; }
      .tmg-rem-urgency.HIGH     { background:rgba(255,107,53,0.12); border:1px solid rgba(255,107,53,0.3); color:#ff6b35; }
      .tmg-rem-urgency.MEDIUM   { background:rgba(255,215,0,0.10); border:1px solid rgba(255,215,0,0.25); color:#ffd700; }
      .tmg-rem-urgency.LOW      { background:rgba(0,200,100,0.08); border:1px solid rgba(0,200,100,0.2); color:#00c864; }
      .tmg-rem-meta { display:flex; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid rgba(0,200,100,0.08); }
      .tmg-rem-role { font-size:10px; color:#5a7090; letter-spacing:0.05em; }
      .tmg-rem-url { font-size:10px; color:#00c8ff; text-decoration:none; letter-spacing:0.03em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px; }
      .tmg-rem-url:hover { text-decoration:underline; }
      .tmg-rem-steps { padding:8px 10px 10px; display:flex; flex-direction:column; gap:5px; }
      .tmg-rem-step { display:flex; gap:7px; align-items:flex-start; font-size:10px; color:#8aaac8; line-height:1.45; }
      .tmg-rem-step-num { min-width:16px; height:16px; border-radius:50%; background:rgba(0,200,100,0.15); border:1px solid rgba(0,200,100,0.3); color:#00c864; font-size:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; font-weight:700; }
      .tmg-rem-open-btn { display:flex; align-items:center; justify-content:center; gap:6px; width:calc(100% - 20px); margin:0 10px 10px; background:rgba(0,200,100,0.08); border:1px solid rgba(0,200,100,0.25); border-radius:5px; color:#00c864; font-size:10px; font-family:inherit; letter-spacing:0.08em; text-transform:uppercase; padding:7px; cursor:pointer; text-decoration:none; transition:all 0.15s; }
      .tmg-rem-open-btn:hover { background:rgba(0,200,100,0.16); border-color:rgba(0,200,100,0.5); }
    `;
    document.head.appendChild(s);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    ensurePanel();
    const inner = document.getElementById('tmg-inner');
    if (!inner) return;
    const m = loadMission();
    const v = getVertical();

    if (!m) {
      inner.innerHTML = `
        <div class="tmg-header">
          <div class="tmg-header-left">
            <span class="tmg-badge">Mission Guide</span>
            <span class="tmg-title">Anomaly Repair</span>
            <span class="tmg-vertical-tag">${v.label}</span>
          </div>
        </div>
        <div class="tmg-empty"><div class="tmg-empty-icon">⚡</div>Fire the engine chain or click an anomaly<br>to load a guided repair workflow.</div>`;
      return;
    }

    if (m._loading) {
      inner.innerHTML = `
        <div class="tmg-header">
          <div class="tmg-header-left">
            <span class="tmg-badge">Mission Guide</span>
            <span class="tmg-title">Generating Workflow…</span>
            <span class="tmg-vertical-tag">${v.label}</span>
          </div>
        </div>
        <div class="tmg-loading">
          <div class="tmg-spinner"></div>
          <div class="tmg-loading-text">TSM Neural Core — Analyzing Anomaly</div>
          <div class="tmg-skel" style="width:80%"></div>
          <div class="tmg-skel" style="width:60%"></div>
          <div class="tmg-skel" style="width:90%"></div>
        </div>`;
      return;
    }

    const steps    = m.steps   || [];
    const apps     = m.apps    || [];
    const tsmWay   = m.tsmWay  || 'AI-driven resolution in minutes';
    const bpoWay   = m.bpoWay  || 'Manual ticket, 3–7 day queue';
    const prompts  = m.prompts || [];
    const doneCount = steps.filter(s => s.status === 'done').length;
    const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

    const codeTag = m.denialCode || extractCode((m.anomalyType || '') + ' ' + (m.anomalySummary || ''));
    const intel   = codeTag ? (DENIAL_INTEL[codeTag] || null) : null;

    // Appeal routing chips (insurance/HC only, when intel exists)
    const di = DOMAIN_INTEL[v.key] || DOMAIN_INTEL.hc;
    const appealHtml = (intel && di.usesDenialIntel)
      ? `<div class="tmg-appeal-row">
           <span class="tmg-appeal-chip${intel.urgency === 'HIGH' ? ' urgent' : ''}">⚑ ${intel.urgency} URGENCY</span>
           <span class="tmg-appeal-chip">→ ${escHtml(intel.appealTeam)}</span>
           <span class="tmg-appeal-chip">${escHtml(intel.appealPath)}</span>
         </div>`
      : '';

    const chipsHtml = apps.length
      ? apps.map(a => `<span class="tmg-chip"><span>◈</span>${escHtml(a)}</span>`).join('')
      : `<span class="tmg-chip"><span>◈</span>Groq AI Query</span>`;

    const stepsHtml = steps.map((s, i) => {
      const isUrgent  = (s.title || '').includes('[URGENT]');
      const cleanTitle = (s.title || '').replace('[URGENT]', '').trim();
      const cls = s.status === 'done' ? 'done' : s.status === 'active' ? 'active' : isUrgent ? 'urgent' : 'pending';
      return `
        <div class="tmg-step ${cls}" data-step-id="${escHtml(s.id)}">
          <div class="tmg-step-num">${s.status === 'done' ? '✓' : i + 1}</div>
          <div class="tmg-step-body">
            <div class="tmg-step-title">${isUrgent ? '⚡ ' : ''}${escHtml(cleanTitle)}</div>
            ${s.instruction ? `<div class="tmg-step-instruction">${escHtml(s.instruction)}</div>` : ''}
            ${s.fieldHint   ? `<div class="tmg-step-hint">↳ ${escHtml(s.fieldHint)}</div>` : ''}
            ${s.status !== 'done' ? `<button class="tmg-step-check" onclick="window.TSMMissionGuide.completeStep('${escHtml(s.id)}')">Mark done ✓</button>` : ''}
          </div>
        </div>`;
    }).join('');

    const promptsHtml = prompts.map(p => `
      <button class="tmg-prompt-btn" onclick="window.TSMMissionGuide.copyPrompt(${JSON.stringify(escHtml(p))})">
        <span class="tmg-prompt-arrow">✈</span>${escHtml(p)}
      </button>`).join('');

    inner.innerHTML = `
      <div class="tmg-header">
        <div class="tmg-header-left">
          <span class="tmg-badge">Mission Guide</span>
          <span class="tmg-title">Anomaly Repair</span>
          <span class="tmg-vertical-tag">${v.label}</span>
        </div>
        <div class="tmg-header-actions">
          <button class="tmg-btn-icon" onclick="window.TSMMissionGuide.regenerate()" title="Regenerate">↻</button>
          <button class="tmg-btn-icon" onclick="window.TSMMissionGuide.hide()" title="Minimize">−</button>
        </div>
      </div>

      <div class="tmg-meta">
        <div class="tmg-anomaly-badge"><span class="tmg-anomaly-dot"></span>Anomaly Detected</div>
        <div class="tmg-anomaly-title">${escHtml(m.anomalyType || 'Document Anomaly')}</div>
        ${m.anomalySummary ? `<div class="tmg-anomaly-summary">${escHtml(m.anomalySummary)}</div>` : ''}
        ${codeTag ? `<span class="tmg-code-tag">${escHtml(codeTag)}</span>` : ''}
        ${appealHtml}
      </div>

      <div class="tmg-progress-wrap">
        <div class="tmg-progress-label"><span>Mission Progress</span><span>${doneCount}/${steps.length} · ${pct}%</span></div>
        <div class="tmg-progress-bar"><div class="tmg-progress-fill" style="width:${pct}%"></div></div>
      </div>

      <div class="tmg-section-label">Apps Used in This Workflow</div>
      <div class="tmg-app-chips">${chipsHtml}</div>

      ${m.remediation ? `
      <div class="tmg-section-label">Remediation App</div>
      <div class="tmg-remediation">
        <div class="tmg-rem-header">
          <span class="tmg-rem-app">◈ ${escHtml(m.remediation.app)}</span>
          <span class="tmg-rem-urgency ${escHtml(m.remediation.urgency || 'MEDIUM')}">${escHtml(m.remediation.urgency || 'MEDIUM')}</span>
        </div>
        <div class="tmg-rem-meta">
          <span class="tmg-rem-role">→ ${escHtml(m.remediation.role)}</span>
          ${m.remediation.url ? `<a class="tmg-rem-url" href="${escHtml(m.remediation.url)}" target="_blank" rel="noopener">${escHtml(m.remediation.url)}</a>` : ''}
        </div>
        <div class="tmg-rem-steps">
          ${(m.remediation.fixSteps || []).map((step, i) => `
          <div class="tmg-rem-step">
            <span class="tmg-rem-step-num">${i + 1}</span>
            <span>${escHtml(step)}</span>
          </div>`).join('')}
        </div>
        ${m.remediation.url ? `<a class="tmg-rem-open-btn" href="${escHtml(m.remediation.url)}" target="_blank" rel="noopener">↗ Open ${escHtml(m.remediation.app)}</a>` : ''}
      </div>` : ''}

      <div class="tmg-compare">
        <div class="tmg-compare-card tsm"><div class="tmg-compare-label">TSM Way</div><div class="tmg-compare-body">${escHtml(tsmWay)}</div></div>
        <div class="tmg-compare-card bpo"><div class="tmg-compare-label">Old BPO Way</div><div class="tmg-compare-body">${escHtml(bpoWay)}</div></div>
      </div>

      ${steps.length ? `<div class="tmg-section-label">Execution Steps</div><div class="tmg-steps">${stepsHtml}</div>` : ''}
      ${prompts.length ? `<div class="tmg-section-label">Ready-to-Use Prompts</div><div class="tmg-prompts">${promptsHtml}</div>` : ''}

      <div class="tmg-footer">
        <button class="tmg-footer-btn" onclick="window.TSMMissionGuide.clearMission()">✕ Clear</button>
        <button class="tmg-footer-btn" onclick="window.TSMMissionGuide.regenerate()">↻ Regenerate</button>
        <button class="tmg-footer-btn primary" onclick="window.TSMMissionGuide.escalate()">Escalate →</button>
      </div>`;

    window.__tmgCurrent = m;
  }

  // ── AI Prompt Builders ─────────────────────────────────────────────────────
  function buildSystem(v) {
    const di = DOMAIN_INTEL[v.key] || DOMAIN_INTEL.hc;
    return `You are TSM Neural Core, an expert ${di.systemRole}.
Generate anomaly-aware guided repair workflows for staff.
Respond ONLY with valid JSON — no markdown, no explanation, no code fences.
Schema: {"apps":["..."],"tsmWay":"...","bpoWay":"...","steps":[{"title":"...","instruction":"...","fieldHint":"..."}],"prompts":["...","..."],"remediation":{"app":"...","url":"...","role":"...","urgency":"...","fixSteps":["...","...","..."]}}`;
  }

  function buildPrompt(m, v) {
    const di = DOMAIN_INTEL[v.key] || DOMAIN_INTEL.hc;
    const codeRaw = m.denialCode || extractCode((m.anomalyType || '') + ' ' + (m.anomalySummary || ''));
    const code    = codeRaw ? codeRaw.toUpperCase() : null;
    const intel   = (code && di.usesDenialIntel) ? (DENIAL_INTEL[code] || null) : null;

    // Full denial/appeal context when available (v3.0 richness)
    const context = intel
      ? `${di.anomalyLabel}: ${code}
DENIAL REASON: ${intel.reason}
MISSING DOCUMENTS: ${intel.missingDocs}
APPEAL TEAM: ${intel.appealTeam}
APPEAL PATH: ${intel.appealPath}
URGENCY: ${intel.urgency}`
      : `ISSUE: ${(m.warRoomContext?.denialReason || m.anomalySummary || m.anomalyType || 'Not specified').slice(0, 200)}`;

    return `Generate a complete guided repair workflow for this ${v.label} anomaly.

VERTICAL: ${v.label}
ANOMALY: ${m.anomalyType || 'Document Issue'}
TARGET APP: ${m.targetApp || v.label + ' War Room'}
${m.payer           || m.warRoomContext?.payer  ? 'PAYER: '   + (m.payer || m.warRoomContext?.payer)   : ''}
${m.claimAmount                                  ? 'AMOUNT: '  + m.claimAmount                         : ''}
${m.patientOrClient                              ? 'SUBJECT: ' + m.patientOrClient                     : ''}
${m.matter                                       ? 'MATTER: '  + m.matter                              : ''}

${context}

REQUIREMENTS:
- apps: 2-4 names from: ${di.appPool.slice(0, 6).join(', ')}
- tsmWay: one sentence how TSM resolves this faster than legacy
- bpoWay: one sentence how legacy BPO handles this (slower, manual)
- steps: exactly 5 objects with title, instruction, fieldHint
${intel ? `  Step 1 must address: ${intel.missingDocs}. Step 5 must escalate to Executive Portal.` : '  Step 5 must escalate to Executive Portal or senior review.'}
${code  ? '  Mark time-critical steps with [URGENT] prefix in title.' : ''}
- prompts: exactly 2 ready-to-use AI prompt strings for the query box
- remediation: object with:
    app: select the BEST TSM app by matching the anomaly keywords against each app's problem domain below.
         IMPORTANT: you must ONLY choose from the apps listed below. Do not reference or select any app outside this list.
         Choose the app whose domain contains the closest semantic match to the detected anomaly.
         App domains:
         ${di.appPool.map(a => `"${a.name}" → handles: ${a.solves.join(', ')}`).join('\n         ')}
         Return the exact app name string from the list above — do not invent a new name.
    url: return the exact url paired with the chosen app name:
         ${di.appPool.map(a => `"${a.name}" → "${a.url}"`).join('\n         ')}
    role: the specific job title who should open this app and action the fix (e.g. "AR Specialist", "Billing Coordinator", "Project Engineer", "QC Manager", "Denial Manager", "Field Superintendent", "Subcontractor PM")
    urgency: one of "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" — based on anomaly severity and financial/schedule impact
    fixSteps: exactly 3 concise action strings — specific steps to take inside the chosen TSM app to resolve this exact anomaly

Respond with ONLY this JSON (no markdown, no fences):
{"apps":["..."],"tsmWay":"...","bpoWay":"...","steps":[{"title":"...","instruction":"...","fieldHint":"..."}],"prompts":["...","..."],"remediation":{"app":"...","url":"...","role":"...","urgency":"...","fixSteps":["...","...","..."]}}`;
  }

  // ── Keyword scorer — fallback app selection ────────────────────────────────
  function scoreBestApp(pool, anomalyText) {
    const text = (anomalyText || '').toLowerCase();
    let best = pool[0];
    let bestScore = 0;
    pool.forEach(function(app) {
      const score = (app.solves || []).reduce(function(acc, keyword) {
        return acc + (text.includes(keyword.toLowerCase()) ? 1 : 0);
      }, 0);
      if (score > bestScore) { bestScore = score; best = app; }
    });
    return best;
  }

  // ── AI Step Regeneration ───────────────────────────────────────────────────
  async function regenerateSteps(m) {
    if (!m) m = loadMission();
    if (!m) return;
    const v = getVertical();

    m._loading = true;
    saveMission(m);
    render();

    try {
      const res = await fetch(v.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: buildSystem(v), message: buildPrompt(m, v), max_tokens: 1400 })
      });
      if (!res.ok) throw new Error('API ' + res.status);
      const data = await res.json();
      let text = (data.result || data.answer || data.response || data.content || '')
        .replace(/```json|```/g, '').trim();
      if (!text || text.startsWith('<')) throw new Error('Non-JSON response');

      let parsed;
      try { parsed = JSON.parse(text); }
      catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error('JSON parse failed');
      }

      m.apps        = parsed.apps        || m.apps    || [];
      m.tsmWay      = parsed.tsmWay      || m.tsmWay  || '';
      m.bpoWay      = parsed.bpoWay      || m.bpoWay  || '';
      m.prompts     = parsed.prompts     || m.prompts || [];

      // ── Guardrail: validate remediation app against vertical appPool ──
      if (parsed.remediation) {
        const pool = di.appPool || [];
        const returned = (parsed.remediation.app || '').toLowerCase();
        const validApp = pool.find(a => a.name.toLowerCase() === returned)
          || pool.find(a => returned.includes(a.name.toLowerCase()))
          || pool.find(a => a.name.toLowerCase().includes(returned))
          || scoreBestApp(pool, m.anomalyType + ' ' + m.anomalySummary);
        parsed.remediation.app = validApp.name;
        parsed.remediation.url = validApp.url;
        m.remediation = parsed.remediation;
      } else {
        m.remediation = null;
      }
      m.steps   = (parsed.steps || []).map((s, i) => ({
        id: 'step-' + i,
        title: s.title || 'Step ' + (i + 1),
        instruction: s.instruction || '',
        fieldHint: s.fieldHint || '',
        status: i === 0 ? 'active' : 'pending'
      }));
      m._loading = false;
      m.generatedAt = new Date().toISOString();
      saveMission(m);

    } catch (err) {
      console.error('TSM Mission Guide: generation failed', err);
      m._loading = false;
      saveMission(m);
    }

    render();
  }

  // ── Step completion ────────────────────────────────────────────────────────
  function completeStep(stepId) {
    const m = loadMission();
    if (!m || !m.steps) return;
    const idx = m.steps.findIndex(s => s.id === stepId);
    if (idx < 0) return;
    m.steps[idx].status = 'done';
    const next = m.steps[idx + 1];
    if (next && next.status === 'pending') next.status = 'active';
    saveMission(m);
    render();
  }

  // ── Escalate ───────────────────────────────────────────────────────────────
  // v3.0 order: named function first, then DOM search (correct for war rooms)
  function escalate() {
    if (typeof escalateToStrategist === 'function') { escalateToStrategist(); return; }
    const execLink = document.querySelector('a[href*="executive"], a[href*="exec-portal"], a[href*="strategist"]');
    if (execLink) { execLink.click(); return; }
    const m = loadMission();
    if (m) try { sessionStorage.setItem('TSM_ESCALATE_RELAY', JSON.stringify(m)); } catch {}
    const btn = document.querySelector('[data-escalate], .escalate-btn, #escalate-btn, #escalate-strategist');
    if (btn) btn.click();
  }

  // ── Copy prompt ───────────────────────────────────────────────────────────
  // Targets all known TSM query box IDs across verticals
  function copyPrompt(text) {
    const box = document.querySelector(
      '#user-input, #ai-query, #situationOverride, ' +
      'textarea[placeholder*="prompt"], textarea[placeholder*="query"], ' +
      'textarea[placeholder*="context"], .ai-input'
    );
    if (box) {
      box.value = text;
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.focus();
      return;
    }
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  // ── Clear mission ──────────────────────────────────────────────────────────
  function clearMission() {
    localStorage.removeItem(STORAGE_KEY);
    window.__tmgCurrent = null;
    render();
  }

  // ── Relay watcher ──────────────────────────────────────────────────────────
  function checkRelayKeys() {
    for (var i = 0; i < RELAY_KEYS.length; i++) {
      var key = RELAY_KEYS[i];
      var raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (!raw) continue;
      try {
        var payload = JSON.parse(raw);
        if (!payload || !payload.anomalyType) continue;
        var existing = loadMission();
        if (!existing || existing.anomalyType !== payload.anomalyType) {
          var m = Object.assign({}, payload, { _loading: true, _sourceKey: key });
          saveMission(m);
          var panel = document.getElementById(PANEL_ID);
          if (panel) panel.style.display = 'flex';
          render();
          regenerateSteps(m);
        }
        return;
      } catch(e) {}
    }
  }

  // ── Engine completion watcher ──────────────────────────────────────────────
  function watchEngineCompletion() {
    var _set = sessionStorage.setItem.bind(sessionStorage);
    sessionStorage.setItem = function(key, value) {
      _set(key, value);
      if (RELAY_KEYS.indexOf(key) > -1) setTimeout(checkRelayKeys, 200);
    };
  }

  // ── Anomaly card click binding ─────────────────────────────────────────────
  function bindAnomalyCardClicks() {
    document.addEventListener('click', function(e) {
      var card = e.target.closest(
        '[data-anomaly-type], .anomaly-card, .anomaly-item, ' +
        '.defect-row, .defect-item'
      );
      if (!card) return;

      var anomalyType    = card.dataset.anomalyType
        || (card.querySelector('.anomaly-type,.defect-type') || {}).textContent || 'Document Anomaly';
      var anomalySummary = card.dataset.anomalySummary
        || (card.querySelector('.anomaly-summary,.defect-desc') || {}).textContent || '';

      var m = {
        anomalyType:     anomalyType.trim(),
        anomalySummary:  anomalySummary.trim(),
        denialCode:      card.dataset.denialCode  || extractCode(anomalyType + ' ' + anomalySummary),
        targetApp:       card.dataset.targetApp   || getVertical().label + ' War Room',
        payer:           card.dataset.payer       || '',
        claimAmount:     card.dataset.claimAmount || '',
        patientOrClient: card.dataset.patient     || '',
        matter:          card.dataset.matter      || '',
        _loading: true,
        _triggeredBy: 'card-click'
      };
      saveMission(m);
      var panel = document.getElementById(PANEL_ID);
      if (panel) {
        panel.style.display = 'flex';
        panel.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
      render();
      regenerateSteps(m);
    });
  }

  // ── Utils ──────────────────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    ensurePanel();

    window.addEventListener('storage', function(e) {
      if (e.key === STORAGE_KEY) render();
      if (RELAY_KEYS.indexOf(e.key) > -1) setTimeout(checkRelayKeys, 200);
    });

    checkRelayKeys();
    setInterval(checkRelayKeys, 3000);
    watchEngineCompletion();
    bindAnomalyCardClicks();
    render();

    window.TSMMissionGuide = {
      refresh:      render,
      show:         function() { var p = document.getElementById(PANEL_ID); if(p) p.style.display='flex'; render(); },
      hide:         function() { var p = document.getElementById(PANEL_ID); if(p) p.style.display='none'; },
      setMission:   function(m) { saveMission(m); render(); regenerateSteps(m); },
      regenerate:   function(m) { regenerateSteps(m || loadMission()); },
      completeStep: completeStep,
      clearMission: clearMission,
      copyPrompt:   copyPrompt,
      escalate:     escalate,
      triggerFromEngine: function(payload) {
        var m = Object.assign({}, payload, { _loading: true, _triggeredBy: 'engine' });
        saveMission(m);
        var p = document.getElementById(PANEL_ID);
        if (p) p.style.display = 'flex';
        render();
        regenerateSteps(m);
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();