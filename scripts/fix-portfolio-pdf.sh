#!/bin/bash

FILE="html/tsm-consultz-portfolio.html"

echo "🔧 Fixing TSM Portfolio PDF Export"

python3 - <<'PY'
from pathlib import Path

p = Path("html/tsm-consultz-portfolio.html")
text = p.read_text()

text = text.replace(
"z-index:-1;",
"z-index:9999;"
)

old = """
    html2pdf().set(opt).from(wrapper).save();
"""

new = """
    document.body.appendChild(wrapper);

    html2pdf()
      .set(opt)
      .from(wrapper)
      .save()
      .then(() => {
        document.body.removeChild(wrapper);
      });
"""

if old in text:
    text = text.replace(old,new)
    print("✅ Portfolio export DOM attach fixed")
else:
    print("⚠️ Portfolio export pattern not found")

p.write_text(text)
PY

echo "✅ PDF patch complete"
