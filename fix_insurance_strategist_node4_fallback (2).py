path = "html/war-rooms/insure-war/insurance-strategist.html"
with open(path) as f:
    content = f.read()

old = '''(ctx,n)=>`===BRIEF===
EXECUTIVE SUMMARY: Insurance operations face a recoverable revenue crisis of $40,000-$80,000 with concurrent compliance exposure. Immediate action on appeals and CE renewals is recommended with 78% BNCA confidence. Expected recovery of 60-80% of exposed revenue within 90 days.
FINANCIAL IMPACT: $40,000-$80,000 exposure | $28,000-$56,000 recoverable | Net risk $12,000-$24,000
RECOMMENDED ACTION: Authorize parallel appeals and compliance remediation immediately
APPROVAL REQUIRED: YES — Principal sign-off on appeal strategy and budget
CFO MEMO SUBJECT: URGENT — Insurance Revenue Recovery & Compliance Action Required
BOARD ITEMS: NO — below board threshold unless exposure exceeds $100,000
30-DAY TARGETS:
- File all eligible appeals — $28,000+ impact
- Complete CE renewals for expiring agents — $0 direct / license protection
- Address top 3 coverage gaps with clients — $42,800 premium opportunity
RELAY TO EXECUTIVE PORTAL: YES
PACKAGE CONFIDENCE: 78%
===JSON===
{"confidence":78,"dataSources":[{"name":"War room engine snapshot","weight":"HIGH"},{"name":"Node 01-03 strategist synthesis","weight":"HIGH"},{"name":"Historical denial pattern (fallback estimate — live model unavailable)","weight":"LOW"}],"reasoning":[{"key":"Exposure basis","val":"Estimated from war room snapshot; not confirmed against live model output"},{"key":"Recovery estimate","val":"$28,000-$56,000 based on typical 60-80% appeal success rate for this denial mix"},{"key":"Confidence note","val":"This package was generated from a fallback template because the live analysis call failed or timed out — treat figures as directional, not verified"}],"recommendedActions":[{"text":"Authorize appeal filing budget","owner":"Principal"},{"text":"Assign compliance lead for DOI audit prep","owner":"Compliance Officer"},{"text":"Approve coverage gap outreach to clients","owner":"Billing Manager"}]}`
];'''

new = '''(ctx,n)=>{
  const bncaMatch = (n[3]||'').match(/BNCA CONFIDENCE SCORE[:\\s]+(\\d+)/i);
  const conf = bncaMatch ? parseInt(bncaMatch[1]) : 78;
  const liveN3 = !!bncaMatch; // did Node 3 actually return a live score to inherit?
  return `===BRIEF===
EXECUTIVE SUMMARY: Insurance operations face a recoverable revenue crisis of $40,000-$80,000 with concurrent compliance exposure. Immediate action on appeals and CE renewals is recommended with ${conf}% BNCA confidence. Expected recovery of 60-80% of exposed revenue within 90 days.
FINANCIAL IMPACT: $40,000-$80,000 exposure | $28,000-$56,000 recoverable | Net risk $12,000-$24,000
RECOMMENDED ACTION: Authorize parallel appeals and compliance remediation immediately
APPROVAL REQUIRED: YES — Principal sign-off on appeal strategy and budget
CFO MEMO SUBJECT: URGENT — Insurance Revenue Recovery & Compliance Action Required
BOARD ITEMS: NO — below board threshold unless exposure exceeds $100,000
30-DAY TARGETS:
- File all eligible appeals — $28,000+ impact
- Complete CE renewals for expiring agents — $0 direct / license protection
- Address top 3 coverage gaps with clients — $42,800 premium opportunity
RELAY TO EXECUTIVE PORTAL: YES
PACKAGE CONFIDENCE: ${conf}%
===JSON===
{"confidence":${conf},"dataSources":[{"name":"War room engine snapshot","weight":"HIGH"},{"name":"Node 01-03 strategist synthesis","weight":"${liveN3?'HIGH':'MED'}"},{"name":"Historical denial pattern (fallback estimate — live model unavailable)","weight":"LOW"}],"reasoning":[{"key":"Exposure basis","val":"Estimated from war room snapshot; not confirmed against live model output"},{"key":"Recovery estimate","val":"$28,000-$56,000 based on typical 60-80% appeal success rate for this denial mix"},{"key":"Confidence note","val":"This package was generated from a fallback template because the live analysis call failed or timed out — treat figures as directional, not verified${liveN3?'. BNCA score inherited from Node 3, which did complete live.':''}"}],"recommendedActions":[{"text":"Authorize appeal filing budget","owner":"Principal"},{"text":"Assign compliance lead for DOI audit prep","owner":"Compliance Officer"},{"text":"Approve coverage gap outreach to clients","owner":"Billing Manager"}]}`;}
];'''

assert old in content, "old NODE_FALLBACKS[3] block not found — file may have changed"
assert content.count(old) == 1, "old block not unique"
content = content.replace(old, new)

with open(path, "w") as f:
    f.write(content)

print("Patched: fallback confidence now inherits Node 3's real score everywhere (text + JSON).")
