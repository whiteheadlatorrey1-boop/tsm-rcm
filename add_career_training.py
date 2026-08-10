import re

path = "html/tsm-hub-index.html"
with open(path, encoding="utf-8") as f:
    c = f.read()

old_pattern = r"(\{sector:'Enterprise',name:'TSM Career OS',url:'/html/tsm-career-os\.html',tier:'cmd',dot:'#00e5ff'\},)"

new_entry = r"\1\n  {sector:'Enterprise',name:'Career Training Platform',url:'/html/tsm-career-training-platform.html',tier:'cmd',dot:'#00e5ff'},"

result = re.sub(old_pattern, new_entry, c)

if result != c:
    with open(path, "w", encoding="utf-8") as f:
        f.write(result)
    print(f"✓ Added Career Training Platform to hub")
else:
    print(f"⚠ Pattern not found")
