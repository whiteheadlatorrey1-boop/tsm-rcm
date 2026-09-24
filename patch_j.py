import sys

def patch(path, old, new, expect=1):
    with open(path, 'r') as f:
        content = f.read()
    count = content.count(old)
    if count != expect:
        print(f"ABORT: {path} — expected {expect} match(es), found {count}", file=sys.stderr)
        print("----- anchor text -----", file=sys.stderr)
        print(old, file=sys.stderr)
        sys.exit(1)
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print(f"OK: {path} — patched ({count} match)")

STRAT = "html/war-rooms/bpo-war/bpo-strategist.html"

patch(STRAT,
"""const BPO_STRAT_SYSTEM_GUARD = 'You are the TSM Shell BPO Decision Intelligence Engine. Follow the requested output format exactly. For any deadline, SLA window, or time-remaining figure (including in RECOMMENDED STRATEGY and escalationTriggers): use only a duration or date explicitly present in the engine analysis or document context provided -- the "24/48/72hr" and "2 hours" style figures in the requested format are illustrative of the SHAPE of an answer only, never the actual value to use. If no real timeframe is present in the context, write "NOT STATED IN SOURCE DATA" for that field instead of picking one of the example numbers. Only state that a document has been obtained, a step completed, or a gap closed if the context confirms it -- anything not confirmed as done must be phrased as a still-needed action, not treated as resolved.';""",
"""const BPO_STRAT_SYSTEM_GUARD = 'You are the TSM Shell BPO Decision Intelligence Engine. Follow the requested output format exactly. For any deadline, SLA window, or time-remaining figure (including in RECOMMENDED STRATEGY and escalationTriggers): use only a duration or date explicitly present in the engine analysis or document context provided -- the "24/48/72hr" and "2 hours" style figures in the requested format are illustrative of the SHAPE of an answer only, never the actual value to use. If no real timeframe is present in the context, write "NOT STATED IN SOURCE DATA" for that field instead of picking one of the example numbers. Only state that a document has been obtained, a step completed, or a gap closed if the context confirms it -- anything not confirmed as done must be phrased as a still-needed action, not treated as resolved. Do not assert revenue loss, SLA breach, client/customer impact, or any other business-impact claim as an established fact unless the engine analysis or document context explicitly states it -- if the source data does not establish it, phrase it as a possible risk to assess (e.g. "potential impact not yet established from available data") rather than a stated outcome.';""")

print("ALL PATCHES APPLIED")
