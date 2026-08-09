#!/usr/bin/env python3
import json, os

BASE = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE, "data")

TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{title} — TSM Demo</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div id="app"></div>
<script>
window.PRESENTATION_DATA = {data_json};
</script>
<script src="assets/engine.js"></script>
</body>
</html>
"""

count = 0
for fname in sorted(os.listdir(DATA_DIR)):
    if not fname.endswith(".json"):
        continue
    with open(os.path.join(DATA_DIR, fname)) as f:
        data = json.load(f)
    html = TEMPLATE.format(
        title=data["title"],
        data_json=json.dumps(data, ensure_ascii=False)
    )
    out_path = os.path.join(BASE, f"{data['vertical']}-presentation.html")
    with open(out_path, "w") as f:
        f.write(html)
    count += 1
    print(f"wrote {out_path}")

print(f"\n{count} presentation files generated.")
