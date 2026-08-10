import re

path = "html/demo/presentation-hub.html"
with open(path, encoding="utf-8") as f:
    c = f.read()

# Find the DECKS array and add the career training deck
old = "const DECKS = ["
new = """const DECKS = [
  {vertical:'CAREER',name:'Career Training Platform',url:'/demo/presentations/career-training-presentation.html',tier:'train',dot:'#a78bfa'},"""

if old in c:
    c = c.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)
    print(f"✓ Added Career Training deck to hub")
else:
    print(f"⚠ Pattern not found")
