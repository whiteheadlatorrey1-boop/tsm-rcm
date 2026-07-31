/**
 * FinOps Document Processor — UI Upgrade Script
 * Drop this into your page with:
 *   <script src="finops-upgrade.js"></script>
 * or paste into DevTools console to preview instantly.
 *
 * What it adds:
 *  1. Live document text panel (scrolling raw text shown as it's "ingested")
 *  2. 4-engine split panel view that activates during processing
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     SAMPLE DOC TEXT per document type
     Replace these with real content from your
     backend — see injectDocText() below.
  ───────────────────────────────────────────── */
  const SAMPLE_TEXTS = {
    'GL Detail Report': `GENERAL LEDGER DETAIL REPORT
Period: October 1–31, 2024  |  Entity: TSM Holdings LLC
────────────────────────────────────────────────────────
Account  Date        Description                  Debit      Credit     Balance
────────────────────────────────────────────────────────
1000     10/01/24    Opening Balance                                   $482,310.00
1000     10/03/24    Wire Transfer — Vendor #4412   $24,800.00         $457,510.00
1000     10/07/24    Customer Payment — Inv 9921                $18,200.00  $475,710.00
5100     10/09/24    SaaS Subscription Q4          $12,000.00         $463,710.00
5100     10/12/24    Post-close Adjustment *FLAG*   $8,450.00         $455,260.00
2200     10/15/24    Accrued Liability — Payroll               $61,400.00  $393,860.00
5200     10/18/24    Office Lease — Oct             $9,800.00         $384,060.00
1200     10/22/24    AR Write-off — Client #882     $3,200.00         $380,860.00
5100     10/25/24    Post-close Entry *FLAG*        $5,100.00         $375,760.00
5300     10/28/24    Depreciation Expense           $4,250.00         $371,510.00
5100     10/31/24    Month-end Reversal *FLAG*      $2,900.00         $368,610.00
────────────────────────────────────────────────────────
FLAGS DETECTED: 3 post-close entries require review
GAAP NOTE: Entries on 10/12, 10/25, 10/31 exceed materiality threshold`,

    'AP Aging Report': `ACCOUNTS PAYABLE AGING REPORT
As of: November 30, 2024  |  Company: TSM Holdings LLC
────────────────────────────────────────────────────────
Vendor Name              Current    30-60 days  61-90 days  90+ days   Total
────────────────────────────────────────────────────────
Apex Software Inc        $12,400    $8,200       $0          $0        $20,600
BridgeNet Solutions      $0         $15,800      $22,400     $41,200   $79,400
Crestline Facilities     $4,100     $0           $0          $18,900   $23,000
DataVault Corp           $0         $0           $31,000     $55,000   $86,000
EverCloud Hosting        $9,200     $12,000      $0          $0        $21,200
Forster Consulting       $0         $0           $0          $28,600   $28,600
────────────────────────────────────────────────────────
TOTALS                   $25,700    $36,000      $53,400     $143,700  $258,800
────────────────────────────────────────────────────────
RISK ALERT: $340,000+ overdue across 12 vendors past 90 days
IRS NOTE: Vendor BridgeNet — TIN mismatch flagged for 1099 review`,

    'AR Ledger': `ACCOUNTS RECEIVABLE LEDGER
Period: Q3–Q4 2024  |  Entity: TSM Holdings LLC
────────────────────────────────────────────────────────
Customer            Invoice#   Date        Due Date    Amount     Status
────────────────────────────────────────────────────────
Pinnacle Group      INV-4401   07/15/24    08/15/24    $42,000    OVERDUE 120d
Meridian Tech       INV-4488   08/01/24    09/01/24    $28,500    OVERDUE 105d
Solara Partners     INV-4502   08/22/24    09/22/24    $19,800    OVERDUE 84d
Keystone Retail     INV-4519   09/10/24    10/10/24    $31,200    OVERDUE 66d
Vantage Corp        INV-4530   09/28/24    10/28/24    $15,600    OVERDUE 48d
Northfield LLC      INV-4544   10/15/24    11/15/24    $22,400    OVERDUE 30d
────────────────────────────────────────────────────────
TOTAL OUTSTANDING: $159,500
90-DAY BUCKET: $180K — allowance for doubtful accounts calculation needed
GAAP NOTE: ASC 310-10 — consider recognizing credit loss allowance`,

    'Bank Reconciliation': `BANK RECONCILIATION STATEMENT
Month End: October 31, 2024  |  Account: Operating #****4821
────────────────────────────────────────────────────────
BANK STATEMENT BALANCE                              $284,610.00
  Add: Deposits in Transit
    10/29/24 — Customer Wire                          $18,200.00
    10/31/24 — ACH Batch                              $9,400.00
  Less: Outstanding Checks
    Ck#10234 — Apex Software (10/28)                ($12,400.00)
    Ck#10241 — Forster Consulting (10/30)            ($8,800.00)
ADJUSTED BANK BALANCE                               $291,010.00
────────────────────────────────────────────────────────
BOOK BALANCE PER GL                                 $278,510.00
  Add: Bank Interest Earned                              $210.00
  Less: Bank Service Charges                            ($210.00)
ADJUSTED BOOK BALANCE                               $278,510.00
────────────────────────────────────────────────────────
VARIANCE: $12,500.00 — UNRECONCILED
RISK FLAG: Difference exceeds materiality threshold ($5,000)
ACTION REQUIRED: Investigate timing difference — month-end cutoff issue suspected`,

    'Budget vs Actual — Q3': `BUDGET VS ACTUAL — Q3 2024
Department: Operations  |  Entity: TSM Holdings LLC
────────────────────────────────────────────────────────
Category              Budget       Actual       Variance    % Var
────────────────────────────────────────────────────────
Salaries & Wages      $210,000     $218,400     ($8,400)    -4.0%
Benefits & Insurance   $42,000      $43,200       ($1,200)   -2.9%
SaaS / Technology      $28,000      $34,600       ($6,600)  -23.6%
Office & Facilities    $18,000      $19,800       ($1,800)  -10.0%
Professional Services  $15,000      $24,200       ($9,200)  -61.3%
Marketing & Outreach   $12,000       $8,400        $3,600    30.0%
────────────────────────────────────────────────────────
TOTAL OPEX            $325,000     $348,600      ($23,600)  -7.3%
────────────────────────────────────────────────────────
NOTE: Operating expenses 23% over budget in select categories
LOW RISK: Overall variance within acceptable range — no material weakness`,

    'Audit Findings Report': `INTERNAL AUDIT FINDINGS — FY2024 Q3
Prepared by: TSM Internal Audit Team
────────────────────────────────────────────────────────
FINDING #1 — CRITICAL: Revenue Recognition Controls
Standard: ASC 606 — Revenue from Contracts with Customers
Condition: Revenue recognized prior to performance obligation completion in 3 instances
Effect: Potential $84,000 overstatement of Q3 revenue
Recommendation: Implement milestone-based recognition gates; update contract templates

FINDING #2 — HIGH: Access Controls — ERP System
Condition: 4 terminated employees retain active system access
Effect: Unauthorized transaction risk; SOX 404 deficiency
Recommendation: Implement automated de-provisioning tied to HR offboarding workflow

FINDING #3 — MEDIUM: Expense Report Approvals
Condition: 18% of expense reports approved by same-level peer vs. manager
Effect: Segregation of duties gap; $12,400 in unsupported expenses
Recommendation: Update approval matrix; retroactive review of flagged expenses

FINDING #4 — LOW: Fixed Asset Register
Condition: 12 assets not tagged; 3 locations unverified
Effect: Depreciation schedule accuracy risk
────────────────────────────────────────────────────────
MATERIAL WEAKNESS IDENTIFIED: Revenue recognition controls
MANAGEMENT RESPONSE DUE: December 15, 2024`,

    'Financial Statements': `FINANCIAL STATEMENTS — YEAR END FY2024
Entity: TSM Holdings LLC  |  Basis: GAAP Accrual
────────────────────────────────────────────────────────
INCOME STATEMENT (P&L)
  Revenue                                          $2,840,000
  Cost of Revenue                                ($1,420,000)
  GROSS PROFIT                                    $1,420,000  (50.0%)

  Operating Expenses:
    Salaries & Benefits                            ($684,000)
    Technology & SaaS                              ($124,800)
    Professional Services                           ($96,400)
    Facilities & Overhead                           ($79,200)
  TOTAL OPEX                                       ($984,400)

  EBITDA                                            $435,600  (15.3%)
  Depreciation & Amortization                       ($51,000)
  OPERATING INCOME (EBIT)                           $384,600  (13.5%)
  Interest Expense                                  ($18,200)
  NET INCOME BEFORE TAX                             $366,400
  Income Tax Provision (21%)                        ($76,944)
  NET INCOME                                        $289,456  (10.2%)
────────────────────────────────────────────────────────
BALANCE SHEET HIGHLIGHTS:
  Total Assets: $1,284,000  |  Total Liabilities: $612,000
  Stockholders' Equity: $672,000
IRS FLAG: Schedule M-1 reconciliation required — book/tax difference $28,400`,

    '1099 Tracker': `1099-NEC / 1099-MISC CONTRACTOR TRACKER — FY2024
Entity: TSM Holdings LLC  |  EIN: XX-XXXXXXX
────────────────────────────────────────────────────────
Contractor Name          TIN Status    YTD Paid    1099 Req    Notes
────────────────────────────────────────────────────────
Alvarez Consulting       ✓ Verified    $18,400     YES         NEC
BrightPath Creative      ✗ MISMATCH    $12,800     HOLD        TIN revalidation needed
Chen Design Studio       ✓ Verified    $9,200      YES         NEC
Davison IT Services      ✓ Verified    $42,000     YES         NEC — high value
EdgeWork Analytics       ✗ MISSING W9  $7,600      HOLD        Backup withholding 24%?
Farrow & Associates      ✓ Verified    $28,400     YES         MISC — rent
────────────────────────────────────────────────────────
[...41 more contractors listed]
────────────────────────────────────────────────────────
SUMMARY: 47 total contractors  |  38 cleared  |  9 require action
IRS THRESHOLD: $600+ — all contractors above threshold flagged for 1099
DEADLINE: January 31, 2025 — recipient copies  |  February 28 — IRS paper filing
RISK: 2 TIN mismatches — potential CP2100 notices from IRS`
  };

  /* ─────────────────────────────────────────────
     ENGINE CONFIGS
  ───────────────────────────────────────────── */
  const ENGINES = [
    {
      id: 'e1',
      label: 'Engine 1',
      title: 'Document Ingestion & Structure Parse',
      icon: '⬇',
      color: '#00d4ff',
      getFindings: (docName) => [
        `Document type detected: ${docName}`,
        'File structure: Tabular + header metadata',
        'Encoding: UTF-8 — no corruption',
        'Page count: 1 | Section count: 4',
        'Column schema mapped: 7 fields identified',
        'Ingestion complete — passing to Engine 2'
      ]
    },
    {
      id: 'e2',
      label: 'Engine 2',
      title: 'Financial Document Classification',
      icon: '◈',
      color: '#a855f7',
      getFindings: (docName) => {
        const riskMap = {
          'GL Detail Report': 'HIGH RISK — post-close anomalies',
          'AP Aging Report': 'MEDIUM RISK — aging concentration',
          'AR Ledger': 'MEDIUM RISK — collectibility concern',
          'Bank Reconciliation': 'HIGH RISK — unreconciled variance',
          'Budget vs Actual — Q3': 'LOW RISK — within tolerance',
          'Audit Findings Report': 'CRITICAL RISK — material weakness',
          'Financial Statements': 'HIGH RISK — book/tax variance',
          '1099 Tracker': 'HIGH RISK — TIN mismatches'
        };
        return [
          `Classification: ${docName}`,
          `Risk tier assigned: ${riskMap[docName] || 'MEDIUM RISK'}`,
          'Document category: FINANCIAL_OPERATIONS',
          'Regulatory scope: GAAP + IRS applicable',
          'Materiality threshold: $5,000 (standard)',
          'Classification confidence: 98.4%'
        ];
      }
    },
    {
      id: 'e3',
      label: 'Engine 3',
      title: 'GAAP/IRS Compliance & Risk Analysis',
      icon: '⚖',
      color: '#f59e0b',
      getFindings: (docName) => {
        const findings = {
          'GL Detail Report': ['ASC 250 — post-close entries flagged', '3 entries exceed materiality', 'Period cutoff risk: HIGH', 'Recommend: CFO review + reversal'],
          'AP Aging Report': ['IRS: 2 vendors — TIN revalidation', '90-day concentration: 55.6% of total', 'Vendor BridgeNet: potential 1099 hold', 'Recommend: AP aging escalation'],
          'AR Ledger': ['ASC 310-10 — credit loss review needed', '$180K in 120+ day bucket', 'Allowance calculation required', 'Recommend: reserve $36K (20%)'],
          'Bank Reconciliation': ['$12,500 variance exceeds threshold', 'SOX 302/404 disclosure risk', 'Month-end cutoff discrepancy', 'Recommend: CFO sign-off required'],
          'Budget vs Actual — Q3': ['Variance within GAAP disclosure limits', 'Professional Services: -61% notable', 'No material adverse findings', 'Recommend: Board reporting optional'],
          'Audit Findings Report': ['ASC 606 material weakness confirmed', 'SOX 404 deficiency — access controls', 'Management letter required by Dec 15', 'Recommend: Immediate remediation plan'],
          'Financial Statements': ['Schedule M-1 required — $28,400 difference', 'Deferred tax liability: recalculate', 'ASC 740 — income tax disclosure needed', 'Recommend: Tax counsel review'],
          '1099 Tracker': ['2 TIN mismatches — CP2100 risk', 'Backup withholding rule applies: EdgeWork', 'Jan 31 deadline: 9 records incomplete', 'Recommend: IRS TIN matching program']
        };
        return findings[docName] || ['Compliance scan in progress', 'GAAP framework: US GAAP', 'IRS cross-reference: active', 'No anomalies detected at this stage'];
      }
    },
    {
      id: 'e4',
      label: 'Engine 4',
      title: 'Next-Action & Finance Node Routing',
      icon: '⟶',
      color: '#10b981',
      getFindings: (docName) => {
        const routes = {
          'GL Detail Report': ['→ Route: CFO Review Queue', '→ Assign: Post-Close Investigation', '→ Notify: Controller + Audit Lead', '→ Deadline: 48 hours', 'Node: GL_RISK_ESCALATION'],
          'AP Aging Report': ['→ Route: AP Manager Dashboard', '→ Assign: Vendor Outreach — 9 vendors', '→ Notify: Treasury + Procurement', '→ Deadline: 5 business days', 'Node: AP_AGING_WORKFLOW'],
          'AR Ledger': ['→ Route: Collections Dashboard', '→ Assign: AR Analyst — 6 accounts', '→ Notify: Revenue + Finance VP', '→ Deadline: Week end', 'Node: AR_COLLECTIONS_NODE'],
          'Bank Reconciliation': ['→ Route: Controller Urgent Queue', '→ Assign: Bank Rec Specialist', '→ Notify: CFO (variance > threshold)', '→ Deadline: Same day', 'Node: BANK_REC_ESCALATION'],
          'Budget vs Actual — Q3': ['→ Route: FP&A Dashboard', '→ Assign: Budget Analyst review', '→ Notify: Department heads', '→ Deadline: Next reporting cycle', 'Node: VARIANCE_ANALYSIS_NODE'],
          'Audit Findings Report': ['→ Route: Audit Committee Queue', '→ Assign: VP Finance + General Counsel', '→ Notify: CEO + Board (material weakness)', '→ Deadline: Dec 15 mandatory', 'Node: AUDIT_CRITICAL_PATH'],
          'Financial Statements': ['→ Route: Tax & Reporting Node', '→ Assign: CPA / External Auditor', '→ Notify: CFO + Tax Director', '→ Deadline: Filing deadline', 'Node: FINANCIAL_STMT_REVIEW'],
          '1099 Tracker': ['→ Route: 1099 Compliance Queue', '→ Assign: Payroll / AP Compliance', '→ Notify: Tax team — 9 action items', '→ Deadline: Jan 31 (IRS)', 'Node: IRS_1099_WORKFLOW']
        };
        return routes[docName] || ['→ Route: General Finance Queue', '→ Assign: Finance Analyst', '→ Notify: Team lead', '→ Deadline: Standard SLA', 'Node: GENERAL_FINANCE'];
      }
    }
  ];

  /* ─────────────────────────────────────────────
     INJECT STYLES
  ───────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    #finops-doc-text-panel {
      background: #0a0f1a;
      border: 1px solid #1a2a3a;
      border-radius: 8px;
      padding: 0;
      overflow: hidden;
      margin-top: 12px;
      display: none;
      flex-direction: column;
    }
    #finops-doc-text-panel .panel-header {
      background: #0d1520;
      border-bottom: 1px solid #1a2a3a;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #4a9eff;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    #finops-doc-text-panel .panel-header .blink {
      width: 8px; height: 8px;
      background: #00d4ff;
      border-radius: 50%;
      animation: blink 1s step-end infinite;
      flex-shrink: 0;
    }
    #finops-doc-text-panel pre {
      margin: 0;
      padding: 14px 16px;
      font-family: 'Courier New', monospace;
      font-size: 11.5px;
      color: #7ec8e3;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 220px;
      overflow-y: auto;
      background: transparent;
    }
    #finops-doc-text-panel pre .highlight {
      color: #f59e0b;
      font-weight: bold;
    }
    #finops-doc-text-panel pre .flag {
      color: #ef4444;
      font-weight: bold;
    }
    #finops-engines-panel {
      display: none;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 12px;
    }
    @media (max-width: 900px) {
      #finops-engines-panel { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 500px) {
      #finops-engines-panel { grid-template-columns: 1fr; }
    }
    .engine-panel {
      background: #090e1a;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #1a2a3a;
      display: flex;
      flex-direction: column;
      min-height: 180px;
    }
    .engine-panel-header {
      padding: 8px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .engine-label {
      font-size: 9px;
      font-family: 'Courier New', monospace;
      letter-spacing: 0.12em;
      font-weight: bold;
      text-transform: uppercase;
      opacity: 0.7;
    }
    .engine-title {
      font-size: 10px;
      color: #e2e8f0;
      font-family: 'Courier New', monospace;
      padding: 0 10px 8px;
      border-bottom: 1px solid #1a2a3a;
      line-height: 1.4;
    }
    .engine-output {
      padding: 8px 10px;
      flex: 1;
      font-family: 'Courier New', monospace;
      font-size: 10px;
      color: #64748b;
      line-height: 1.8;
      overflow-y: auto;
    }
    .engine-output .line {
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.3s, transform 0.3s;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .engine-output .line.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .engine-output .line.done {
      color: #22d3ee;
    }
    .engine-status {
      padding: 6px 10px;
      font-size: 9px;
      font-family: 'Courier New', monospace;
      border-top: 1px solid #1a2a3a;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .engine-status .dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #1a2a3a;
      flex-shrink: 0;
    }
    .engine-status.running .dot { background: #f59e0b; animation: blink 0.8s step-end infinite; }
    .engine-status.done .dot { background: #10b981; }
    .engine-status.waiting .dot { background: #334155; }
    @keyframes blink {
      0%,100% { opacity: 1; }
      50% { opacity: 0.1; }
    }
    #finops-engines-panel.active { display: grid; }
    #finops-doc-text-panel.active { display: flex; }
    .finops-section-label {
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #4a9eff;
      font-family: 'Courier New', monospace;
      margin: 14px 0 6px;
      display: none;
    }
    .finops-section-label.active { display: block; }
  `;
  document.head.appendChild(style);

  /* ─────────────────────────────────────────────
     FIND THE RIGHT-SIDE OUTPUT PANEL
     (the one showing "Awaiting financial document...")
     We'll inject our new panels INSIDE it, below
     the existing engine list lines.
  ───────────────────────────────────────────── */
  function findOutputPanel() {
    // Find the element containing "Awaiting financial document"
    const all = Array.from(document.querySelectorAll('div, section, aside'));
    for (const el of all) {
      if (
        el.children.length > 0 &&
        el.textContent.includes('Awaiting financial document') &&
        el.textContent.includes('Engine 1')
      ) {
        return el;
      }
    }
    // Fallback: any element with "Engine 4"
    for (const el of all) {
      if (el.textContent.includes('Engine 4') && el.textContent.includes('Engine 1')) {
        return el;
      }
    }
    return null;
  }

  /* ─────────────────────────────────────────────
     BUILD THE NEW PANELS
  ───────────────────────────────────────────── */
  function buildPanels() {
    const outputPanel = findOutputPanel();
    if (!outputPanel) {
      console.warn('[FinOps Upgrade] Could not find right-side output panel. Injecting at body end.');
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'finops-upgrade-wrapper';
    wrapper.style.cssText = 'width:100%; box-sizing:border-box; margin-top:12px;';

    // Section label — raw text
    const rawLabel = document.createElement('div');
    rawLabel.className = 'finops-section-label';
    rawLabel.id = 'finops-raw-label';
    rawLabel.textContent = '▸ Raw Document Content — Ingestion Stream';
    wrapper.appendChild(rawLabel);

    // Doc text panel
    const docPanel = document.createElement('div');
    docPanel.id = 'finops-doc-text-panel';
    docPanel.innerHTML = `
      <div class="panel-header">
        <div class="blink"></div>
        <span>INGEST STREAM</span>
        <span id="finops-doc-name" style="color:#7ec8e3;margin-left:4px;"></span>
        <span style="margin-left:auto;color:#334155;" id="finops-char-count">0 chars</span>
      </div>
      <pre id="finops-doc-pre"></pre>
    `;
    wrapper.appendChild(docPanel);

    // Section label — engines
    const engLabel = document.createElement('div');
    engLabel.className = 'finops-section-label';
    engLabel.id = 'finops-eng-label';
    engLabel.textContent = '▸ 4-Engine Analysis Pipeline';
    wrapper.appendChild(engLabel);

    // Engines panel
    const enginesPanel = document.createElement('div');
    enginesPanel.id = 'finops-engines-panel';

    ENGINES.forEach(eng => {
      const ep = document.createElement('div');
      ep.className = 'engine-panel';
      ep.id = `finops-${eng.id}`;
      ep.innerHTML = `
        <div class="engine-panel-header" style="background:${eng.color}18;border-bottom:1px solid ${eng.color}30;">
          <span style="color:${eng.color};font-size:14px;">${eng.icon}</span>
          <span class="engine-label" style="color:${eng.color};">${eng.label}</span>
        </div>
        <div class="engine-title">${eng.title}</div>
        <div class="engine-output" id="${eng.id}-output"></div>
        <div class="engine-status waiting" id="${eng.id}-status">
          <div class="dot"></div>
          <span id="${eng.id}-status-text">WAITING</span>
        </div>
      `;
      enginesPanel.appendChild(ep);
    });

    wrapper.appendChild(enginesPanel);

    // Inject INSIDE the right output panel, or fall back to body end
    if (outputPanel) {
      outputPanel.appendChild(wrapper);
    } else {
      document.body.appendChild(wrapper);
    }
  }

  /* ─────────────────────────────────────────────
     ANIMATE DOC TEXT (character stream)
  ───────────────────────────────────────────── */
  let docAnimTimer = null;

  function injectDocText(docName) {
    const text = SAMPLE_TEXTS[docName] || `Document: ${docName}\n[Loading content from backend...]`;
    const pre = document.getElementById('finops-doc-pre');
    const nameEl = document.getElementById('finops-doc-name');
    const countEl = document.getElementById('finops-char-count');
    if (!pre) return;
    pre.innerHTML = '';
    pre.dataset.finalText = text;

    nameEl.textContent = `— ${docName}`;
    pre.innerHTML = '';
    let i = 0;
    if (docAnimTimer) clearInterval(docAnimTimer);

    // Stream characters in chunks
    const CHUNK = 4;
    docAnimTimer = setInterval(() => {
      if (i >= text.length) { clearInterval(docAnimTimer); return; }
      const slice = text.slice(i, i + CHUNK);
      i += CHUNK;
      // Color-code flags inline
      const escaped = slice
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      pre.innerHTML += escaped;
      countEl.textContent = `${Math.min(i, text.length)} chars`;
      // Auto-scroll
      pre.scrollTop = pre.scrollHeight;
    }, 12);

    // After stream done, do a re-render with colored flags
    setTimeout(() => {
      let colored = text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/(\*FLAG\*)/g, '<span class="flag">$1</span>')
        .replace(/(✗[^\n]+)/g, '<span class="flag">$1</span>')
        .replace(/(✓[^\n]+)/g, '<span class="highlight">$1</span>')
        .replace(/(CRITICAL[^\n]*|MATERIAL WEAKNESS[^\n]*)/g, '<span class="flag">$1</span>')
        .replace(/(RISK ALERT[^\n]*|RISK FLAG[^\n]*|IRS FLAG[^\n]*|IRS NOTE[^\n]*)/g, '<span class="highlight">$1</span>');
      pre.innerHTML = colored;
      pre.scrollTop = 0;
    }, text.length / CHUNK * 12 + 200);
  }

  /* ─────────────────────────────────────────────
     RUN THE 4 ENGINES
  ───────────────────────────────────────────── */
  function runEngines(docName) {
    const delays = [400, 1800, 3400, 5200]; // stagger engine starts

    ENGINES.forEach((eng, idx) => {
      const outputEl = document.getElementById(`${eng.id}-output`);
      const statusEl = document.getElementById(`${eng.id}-status`);
      const statusText = document.getElementById(`${eng.id}-status-text`);
      if (!outputEl) return;

      outputEl.innerHTML = '';
      statusEl.className = 'engine-status waiting';
      statusText.textContent = 'WAITING';

      const findings = eng.getFindings(docName);

      setTimeout(() => {
        // Mark as running
        statusEl.className = 'engine-status running';
        statusText.textContent = 'RUNNING';

        // Stream each finding line
        findings.forEach((line, li) => {
          setTimeout(() => {
            const div = document.createElement('div');
            div.className = 'line';
            div.textContent = `› ${line}`;
            outputEl.appendChild(div);
            // Trigger animation next frame
            requestAnimationFrame(() => {
              requestAnimationFrame(() => div.classList.add('visible'));
            });
            outputEl.scrollTop = outputEl.scrollHeight;

            // Mark done after last line
            if (li === findings.length - 1) {
              setTimeout(() => {
                statusEl.className = 'engine-status done';
                statusText.textContent = 'COMPLETE';
                // Mark all lines as done color
                outputEl.querySelectorAll('.line').forEach(d => d.classList.add('done'));
              }, 400);
            }
          }, li * 350);
        });
      }, delays[idx]);
    });
  }

  /* ─────────────────────────────────────────────
     INTERCEPT "PROCESS DOCUMENT" CLICK
  ───────────────────────────────────────────── */
  function getSelectedDoc() {
    // Try to find the selected/active document card
    // Look for highlighted/selected card
    const cards = document.querySelectorAll('[class*="card"], [class*="doc"], [class*="item"]');
    for (const card of cards) {
      const style = window.getComputedStyle(card);
      const border = style.borderColor || '';
      if (border.includes('255') || border.includes('0, 212') || border.includes('cyan')) {
        const h = card.querySelector('h2, h3, strong, [class*="title"]');
        if (h) return h.textContent.trim();
      }
    }

    // Fallback: find any element matching known doc names
    const allText = document.body.innerText;
    for (const name of Object.keys(SAMPLE_TEXTS)) {
      if (allText.includes(name)) {
        // Check if it looks selected by checking nearby DOM
        const els = Array.from(document.querySelectorAll('*'))
          .filter(el => el.childElementCount === 0 && el.textContent.trim() === name);
        if (els.length > 0) {
          const el = els[0];
          const parent = el.closest('[class]');
          if (parent) {
            const cs = window.getComputedStyle(parent);
            const bg = cs.backgroundColor;
            // Any non-fully-transparent bg on parent may indicate selection
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
              return name;
            }
          }
        }
      }
    }
    return null;
  }

  function watchForProcess() {
    document.addEventListener('click', (e) => {
      const el = e.target;
      const text = el.textContent?.trim() || '';

      // Match process button
      if (text.includes('PROCESS DOCUMENT') || el.id?.includes('process') || el.closest('[id*="process"]')) {
        // Show panels
        document.getElementById('finops-raw-label')?.classList.add('active');
        document.getElementById('finops-eng-label')?.classList.add('active');
        document.getElementById('finops-doc-text-panel')?.classList.add('active');
        document.getElementById('finops-engines-panel')?.classList.add('active');

        // Detect selected doc (with slight delay to allow click handlers to fire)
        setTimeout(() => {
          const docName = getSelectedDoc() || Object.keys(SAMPLE_TEXTS)[0];
          injectDocText(docName);
          runEngines(docName);
        }, 100);
      }

      // Also watch doc card clicks so we can pre-load text
      const card = el.closest('[class*="card"], [class*="doc-item"], [class*="document"]');
      if (card) {
        const h = card.querySelector('h2, h3, strong, b');
        if (h && SAMPLE_TEXTS[h.textContent.trim()]) {
          window.__finopsSelectedDoc = h.textContent.trim();
        }
      }
    }, true);
  }

  /* Also expose a manual trigger for testing / integration */
  window.finopsProcessDoc = function (docName) {
    docName = docName || Object.keys(SAMPLE_TEXTS)[0];
    document.getElementById('finops-raw-label')?.classList.add('active');
    document.getElementById('finops-eng-label')?.classList.add('active');
    document.getElementById('finops-doc-text-panel')?.classList.add('active');
    document.getElementById('finops-engines-panel')?.classList.add('active');
    injectDocText(docName);
    runEngines(docName);
  };

  /* ─────────────────────────────────────────────
     INIT
  ───────────────────────────────────────────── */
  function init() {
    buildPanels();
    watchForProcess();
    console.log(
      '%c[FinOps Upgrade] Loaded ✓',
      'color:#00d4ff;font-family:monospace;font-weight:bold'
    );
    console.log(
      '%cTest with: finopsProcessDoc("GL Detail Report")',
      'color:#7ec8e3;font-family:monospace'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();