path = "html/demo/presentation-hub.html"
with open(path, encoding="utf-8") as f:
    c = f.read()

# Replace the old format Career Training entry with the new format
old = """  {vertical:'CAREER',name:'Career Training Platform',url:'/demo/presentations/career-training-presentation.html',tier:'train',dot:'#a78bfa'},"""

new = """  { tag: 'CAREER-TRAIN', name: 'Career Training Platform', cat: 'core', href: `${PRES}/career-training-presentation.html`,
    desc: 'Upskill teams on real incident data and decision intelligence patterns from live war room cases.' },"""

if old in c:
    c = c.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)
    print(f"✓ Fixed Career Training deck format")
else:
    print(f"⚠ Pattern not found")
