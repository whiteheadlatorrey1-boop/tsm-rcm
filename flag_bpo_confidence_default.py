path = "html/war-rooms/bpo-war/bpo-strategist.html"
with open(path) as f:
    content = f.read()

old = '''      const obj = JSON.parse(jsonStr.match(/\\{[\\s\\S]*\\}/)[0]);
      generatedRec = obj;
      renderRecommendation(obj);'''

new = '''      const obj = JSON.parse(jsonStr.match(/\\{[\\s\\S]*\\}/)[0]);
      // Flag when the live model's JSON omits confidence — every downstream
      // consumer (sentinel push, relay bar, mission store, escalation memo)
      // reads generatedRec.confidence, so patch it here once instead of
      // silently defaulting to 91 in four separate places.
      if (obj.confidence === undefined || obj.confidence === null) {
        console.warn('[bpo-strategist] Live response omitted "confidence" field — defaulting to 91. Raw JSON:', obj);
        obj.confidence = 91;
        obj.confidenceDefaulted = true;
      }
      generatedRec = obj;
      renderRecommendation(obj);'''

assert old in content, "target block not found — file may have changed"
assert content.count(old) == 1, "target block not unique"
content = content.replace(old, new)

with open(path, "w") as f:
    f.write(content)

print("Flagged missing-confidence default with console.warn + obj.confidenceDefaulted marker.")
