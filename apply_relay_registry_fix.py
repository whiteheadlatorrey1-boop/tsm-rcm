path = "html/war-rooms/_relay_control_plane/relay.core.js"
src = open(path, encoding="utf-8").read()

anchor = '  L1COPILOT: "TSM_L1_COPILOT_RELAY",\n'
assert src.count(anchor) == 1, "L1COPILOT anchor not found or not unique"
assert "FIX_VALIDATED_FROM_CC" not in src, "already registered — aborting"

block = anchor + '  FIX_VALIDATED_FROM_CC: "TSM_FIX_VALIDATED_FROM_CC_RELAY",\n'
src2 = src.replace(anchor, block, 1)
assert src2 != src, "insertion had no effect"

open(path, "w", encoding="utf-8").write(src2)
print("Applied: registered FIX_VALIDATED_FROM_CC in RELAY_REGISTRY")
