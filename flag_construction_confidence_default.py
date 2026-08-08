path = "html/war-rooms/construct-war/construction-strategist.html"
with open(path) as f:
    content = f.read()

old = '''  const topAction = conObj?.recommendedActions?.[0];
  const anomaly = {
    id: 'con-' + Date.now(),
    title: (warRoomRelay.docType || 'Construction') + ' — Strategist Synthesis',
    severity: riskToSeverity(riskNum),
    exposure: exposureNum,
    confidence: conObj?.confidence ?? 70,'''

new = '''  const topAction = conObj?.recommendedActions?.[0];
  if (conObj && conObj.confidence == null) {
    console.warn('[sentinel-push] construction: live response omitted "confidence" field — defaulting to 70. Raw JSON:', conObj);
    conObj.confidenceDefaulted = true;
  }
  const anomaly = {
    id: 'con-' + Date.now(),
    title: (warRoomRelay.docType || 'Construction') + ' — Strategist Synthesis',
    severity: riskToSeverity(riskNum),
    exposure: exposureNum,
    confidence: conObj?.confidence ?? 70,'''

assert old in content, "target block not found — file may have changed"
assert content.count(old) == 1, "target block not unique"
content = content.replace(old, new)
with open(path, "w") as f:
    f.write(content)
print("Flagged construction-strategist.html missing-confidence default.")
