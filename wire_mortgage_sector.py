#!/usr/bin/env python3
"""
Wires the Mortgage sector into tsm-doc-search-multi.html:
- CSS accent var + .vtab/.node-link classes
- vtab button (between Real Estate and Legal)
- VERTICALS.mortgage entry -> routes to html/reo-pro/mortgage/index.html
- WAR_ROOM_ROUTES + wr fallback map + both warRoomKeys autorun maps
- 8 DEMO_DOCS seed records: 2x each of the 4 most-used mortgage doc types
  (1003 Loan Application, Loan Estimate, Closing Disclosure, Appraisal Report)
- 4 new DOC_TYPE_COLORS entries

Idempotent: safe to re-run, skips any block already present.
Usage: python3 wire_mortgage_sector.py [path-to-tsm-doc-search-multi.html]
"""
import sys, re

PATH = sys.argv[1] if len(sys.argv) > 1 else "html/tsm-doc-search-multi.html"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

applied, skipped = [], []

def patch(label, anchor, insert, after=True, once_marker=None):
    global src
    marker = once_marker or insert
    if marker in src:
        skipped.append(label)
        return
    if anchor not in src:
        print(f"[FAIL] anchor not found for: {label}")
        print(f"       expected anchor:\n{anchor!r}")
        sys.exit(1)
    src = src.replace(anchor, anchor + insert if after else insert + anchor, 1)
    applied.append(label)

# 1. CSS accent var
patch(
    "CSS var --mortgage",
    '  --hc:   #fb923c;  /* Healthcare – orange */\n',
    '  --mortgage: #eab308;  /* Mortgage – gold */\n',
)

# 2. .vtab.active rule
patch(
    "vtab active rule",
    '.vtab.active[data-v="hc"]  { background: rgba(251,146,60,0.08);  color: var(--hc);  border-bottom: 2px solid var(--hc); }\n',
    '.vtab.active[data-v="mortgage"] { background: rgba(234,179,8,0.08); color: var(--mortgage); border-bottom: 2px solid var(--mortgage); }\n',
)

# 3. .vtab-dot rule
patch(
    "vtab-dot rule",
    '.vtab[data-v="hc"]  .vtab-dot { background: var(--hc); }\n',
    '.vtab[data-v="mortgage"] .vtab-dot { background: var(--mortgage); }\n',
)

# 4. node-link CSS
patch(
    "node-link CSS",
    '.node-link.hc:hover  { background: rgba(251,146,60,0.18); }\n',
    '.node-link.mortgage { background: rgba(234,179,8,0.08); color: var(--mortgage); border: 1px solid rgba(234,179,8,0.2); }\n'
    '.node-link.mortgage:hover { background: rgba(234,179,8,0.18); }\n',
)

# 5. vtab button (between Real Estate and Legal)
patch(
    "Mortgage vtab button",
    '    <button class="vtab"        data-v="re" onclick="switchVertical(\'re\')"><span class="vtab-dot"></span>Real Estate</button>\n',
    '    <button class="vtab"        data-v="mortgage" onclick="switchVertical(\'mortgage\')"><span class="vtab-dot"></span>Mortgage</button>\n',
)

# 6. VERTICALS.mortgage entry (inserted right before the `leg:` block)
vertical_block = '''  mortgage: {
    label: "Mortgage",
    color: "#eab308",
    cls:   "mortgage",
    storageKey: "tsm_doc_index_mortgage",
    searchPlaceholder: "Search by borrower, loan #, lender, LTV, doc type...",
    nodes: {
      "mortgage-war-room": { label:"Mortgage Command", route:"/html/reo-pro/mortgage/index.html" },
      "strategist":        { label:"Strategist",       route:"/html/reo-pro/re-strategist.html" },
      "bnca-engine":       { label:"BNCA Escalated",   route:"/html/reo-pro/re-exec-portal.html" },
    },
    seed: []
  },
'''
patch(
    "VERTICALS.mortgage entry",
    '  leg: {\n',
    vertical_block,
    after=False,
)

# 7. DOC_TYPE_COLORS entries
patch(
    "DOC_TYPE_COLORS mortgage types",
    '  "DENIAL":           { bg:"rgba(251,146,60,0.12)",  text:"#fb923c" },\n',
    '  "LOAN APPLICATION":  { bg:"rgba(234,179,8,0.12)",  text:"#eab308" },\n'
    '  "LOAN ESTIMATE":     { bg:"rgba(250,204,21,0.12)", text:"#facc15" },\n'
    '  "CLOSING DISCLOSURE":{ bg:"rgba(202,138,4,0.12)",  text:"#ca8a04" },\n'
    '  "APPRAISAL REPORT":  { bg:"rgba(217,119,6,0.12)",  text:"#d97706" },\n',
)

# 8. WAR_ROOM_ROUTES entry
patch(
    "WAR_ROOM_ROUTES mortgage-war-room",
    "  're-war-room':  { label:'Real Estate War Room',   url:'/html/reo-pro/re-war-room.html',                     relay:'tsm_re_docsearch_relay',     autoKey:'TSM_RE_WAR_RELAY' },\n",
    "  'mortgage-war-room': { label:'Mortgage Command',  url:'/html/reo-pro/mortgage/index.html',                  relay:'tsm_mortgage_docsearch_relay',autoKey:'TSM_MORTGAGE_WAR_RELAY' },\n",
)

# 9. wr fallback map (cleanRouting)
old_wr = "governance:'governance-war-room','integration-hub':'integration-war-room','digital-twin':'digitaltwin-war-room','bpo-ops':'bpoops-war-room'};"
new_wr = "governance:'governance-war-room','integration-hub':'integration-war-room','digital-twin':'digitaltwin-war-room','bpo-ops':'bpoops-war-room',mortgage:'mortgage-war-room'};"
if old_wr in src and "mortgage:'mortgage-war-room'};" not in src:
    src = src.replace(old_wr, new_wr, 1)
    applied.append("cleanRouting wr map mortgage key")
elif "mortgage:'mortgage-war-room'};" in src:
    skipped.append("cleanRouting wr map mortgage key")
else:
    print("[FAIL] anchor not found for cleanRouting wr map")
    sys.exit(1)

# 10. warRoomKeys autorun maps (both occurrences)
old_wrk = "governance:'governance-war-room', integrationhub:'integration-war-room', digitaltwin:'digitaltwin-war-room', bpoops:'bpoops-war-room' };"
new_wrk = "governance:'governance-war-room', integrationhub:'integration-war-room', digitaltwin:'digitaltwin-war-room', bpoops:'bpoops-war-room', mortgage:'mortgage-war-room' };"
count_before = src.count(old_wrk)
if count_before:
    src = src.replace(old_wrk, new_wrk)
    applied.append(f"warRoomKeys autorun map mortgage key (x{count_before})")
elif new_wrk in src:
    skipped.append("warRoomKeys autorun map mortgage key")
else:
    print("[FAIL] anchor not found for warRoomKeys autorun maps")
    sys.exit(1)

# 11. DEMO_DOCS: 8 sample mortgage docs (2x each of the 4 most-used doc types)
demo_docs_block = '''
  { id:'dd-mtg-1003a', verticals:['mortgage'], fileName:'1003_Loan_Application_Reyes.pdf',      documentType:'LOAN APPLICATION',  vendor:'',                    invoiceNo:'1003-24-0091', exclusionCode:'',        amount:395000, sourceNodes:{mortgage:'mortgage-war-room'}, routing:{mortgage:['mortgage-war-room','strategist']},                 _ext:{client:'Carlos Reyes',      ref:'1003-24-0091', defectFlags:[]},                 tags:['1003','urla','loan application','borrower','mortgage','purchase'] },
  { id:'dd-mtg-1003b', verticals:['mortgage'], fileName:'1003_Loan_Application_Nguyen_Refi.pdf', documentType:'LOAN APPLICATION',  vendor:'',                    invoiceNo:'1003-24-0114', exclusionCode:'',        amount:268000, sourceNodes:{mortgage:'mortgage-war-room'}, routing:{mortgage:['mortgage-war-room','strategist']},                 _ext:{client:'Tran Nguyen',       ref:'1003-24-0114', defectFlags:[]},                 tags:['1003','urla','loan application','borrower','mortgage','refinance'] },
  { id:'dd-mtg-le-a',  verticals:['mortgage'], fileName:'Loan_Estimate_Reyes.pdf',               documentType:'LOAN ESTIMATE',     vendor:'Desert Ridge Lending', invoiceNo:'LE-24-0091',   exclusionCode:'',        amount:395000, sourceNodes:{mortgage:'mortgage-war-room'}, routing:{mortgage:['mortgage-war-room','strategist']},                 _ext:{client:'Carlos Reyes',      ref:'LE-24-0091',   defectFlags:[]},                 tags:['loan estimate','trid','rate lock','apr','mortgage','borrower'] },
  { id:'dd-mtg-le-c',  verticals:['mortgage'], fileName:'Loan_Estimate_Whitfield.pdf',           documentType:'LOAN ESTIMATE',     vendor:'Desert Ridge Lending', invoiceNo:'LE-24-0132',   exclusionCode:'RATE-CHG',amount:452000, sourceNodes:{mortgage:'mortgage-war-room'}, routing:{mortgage:['mortgage-war-room','strategist','bnca-engine']},   _ext:{client:'Amanda Whitfield',  ref:'LE-24-0132',   defectFlags:['UW Conditions']}, tags:['loan estimate','trid','rate lock','apr','mortgage','borrower','change of circumstance'] },
  { id:'dd-mtg-cd-a',  verticals:['mortgage'], fileName:'Closing_Disclosure_Reyes.pdf',          documentType:'CLOSING DISCLOSURE',vendor:'Premier Escrow Co',   invoiceNo:'CD-24-0091',   exclusionCode:'',        amount:395000, sourceNodes:{mortgage:'mortgage-war-room'}, routing:{mortgage:['mortgage-war-room','strategist']},                 _ext:{client:'Carlos Reyes',      ref:'CD-24-0091',   defectFlags:[]},                 tags:['closing disclosure','trid','escrow','mortgage','borrower','cash to close'] },
  { id:'dd-mtg-cd-d',  verticals:['mortgage'], fileName:'Closing_Disclosure_Whitfield.pdf',      documentType:'CLOSING DISCLOSURE',vendor:'Premier Escrow Co',   invoiceNo:'CD-24-0132',   exclusionCode:'FEE-VAR', amount:452000, sourceNodes:{mortgage:'mortgage-war-room'}, routing:{mortgage:['mortgage-war-room','strategist','bnca-engine']},   _ext:{client:'Amanda Whitfield',  ref:'CD-24-0132',   defectFlags:['Closing Delay']},  tags:['closing disclosure','trid','escrow','mortgage','borrower','fee variance','tolerance cure'] },
  { id:'dd-mtg-appr-a',verticals:['mortgage'], fileName:'Appraisal_Report_88_Saguaro_Way.pdf',   documentType:'APPRAISAL REPORT',  vendor:'AZ Valuation Group',  invoiceNo:'APR-24-0091',  exclusionCode:'',        amount:398000, sourceNodes:{mortgage:'mortgage-war-room'}, routing:{mortgage:['mortgage-war-room','strategist']},                 _ext:{client:'Carlos Reyes',      ref:'APR-24-0091',  defectFlags:[]},                 tags:['appraisal','uad','comps','mortgage','borrower','ltv'] },
  { id:'dd-mtg-appr-e',verticals:['mortgage'], fileName:'Appraisal_Report_14_Cactus_Bloom_Ln.pdf',documentType:'APPRAISAL REPORT', vendor:'AZ Valuation Group',  invoiceNo:'APR-24-0132',  exclusionCode:'APPR-GAP',amount:452000, sourceNodes:{mortgage:'mortgage-war-room'}, routing:{mortgage:['mortgage-war-room','strategist','bnca-engine']},   _ext:{client:'Amanda Whitfield',  ref:'APR-24-0132',  defectFlags:['Appraisal Gap']},  tags:['appraisal','uad','comps','mortgage','borrower','ltv','value gap'] },
'''
patch(
    "DEMO_DOCS mortgage seed records",
    "  { id:'dd-bpo2-cap',  verticals:['bpo-ops'],   fileName:'Capacity_Exception_CAP-129.pdf',        documentType:'DOCUMENT REPORT',vendor:'',                invoiceNo:'CAP-129',     exclusionCode:'CAP-OVR', amount:0,     sourceNodes:{'bpo-ops':'bpoops-war-room'}, routing:{'bpo-ops':['bpoops-war-room','strategist']}, _ext:{client:'BPO Services', ref:'CAP-129', defectFlags:[]}, tags:['capacity','exception','bpo ops','phase'] },\n",
    demo_docs_block,
)

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("\n=== Mortgage sector wiring ===")
for a in applied:
    print(f"  [OK]      {a}")
for s in skipped:
    print(f"  [SKIP]    {s} (already present)")
print(f"\nDone. {len(applied)} block(s) applied, {len(skipped)} already in place.")
print("Restart your server / hard-refresh, then use 'Seed Demo Records' on the Mortgage tab.")