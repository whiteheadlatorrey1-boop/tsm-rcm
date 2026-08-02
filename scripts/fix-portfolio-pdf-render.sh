#!/bin/bash

python3 - <<'PY'
from pathlib import Path

p = Path("html/tsm-consultz-portfolio.html")
text = p.read_text()

text = text.replace(
"""wrapper.style.cssText = 'background:#060c14;color:#e8f0f8; font-family:Inter,sans-serif; padding:2rem;';""",
"""wrapper.style.cssText = `
position:absolute;
left:0;
top:0;
width:850px;
background:#ffffff;
color:#111111;
font-family:Inter,sans-serif;
padding:2rem;
z-index:99999;
`;"""
)

text = text.replace(
"""clone.style.pageBreakAfter = 'always';
        wrapper.appendChild(clone);""",
"""clone.style.pageBreakAfter = 'always';
        clone.style.display = 'block';
        clone.style.visibility = 'visible';
        clone.style.opacity = '1';
        wrapper.appendChild(clone);"""
)

text = text.replace(
"""html2canvas: { scale: 1.5, backgroundColor: '#020408', useCORS: true }""",
"""html2canvas: {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      }"""
)

p.write_text(text)
print("✅ Portfolio PDF renderer hardened")
PY
