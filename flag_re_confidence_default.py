path = "html/war-rooms/re-war/re-strategist.html"
with open(path) as f:
    content = f.read()

old = '''      const reXPBaseExposure = reXPParseExposureLow(reXPDollarRisk);
      const reXPSeverity = reXPSeverityForExposure(reXPBaseExposure);
      const reXPConf = Number.isFinite(obj.confidence) ? obj.confidence : 70;'''

new = '''      const reXPBaseExposure = reXPParseExposureLow(reXPDollarRisk);
      const reXPSeverity = reXPSeverityForExposure(reXPBaseExposure);
      if (!Number.isFinite(obj.confidence)) {
        console.warn('[bnca-exposure-engine] realestate: live response omitted "confidence" field — defaulting to 70. Raw JSON:', obj);
        obj.confidenceDefaulted = true;
      }
      const reXPConf = Number.isFinite(obj.confidence) ? obj.confidence : 70;'''

assert old in content, "target block not found — file may have changed"
assert content.count(old) == 1, "target block not unique"
content = content.replace(old, new)
with open(path, "w") as f:
    f.write(content)
print("Flagged re-strategist.html missing-confidence default.")
