import re

path = "html/tsm-hub-index.html"
with open(path, encoding="utf-8") as f:
    c = f.read()

pattern = r"  \{sector:'BPO',name:'BPO Command Center'.*?\{sector:'BPO',name:'BPO Competitive Playbook'.*?\},"

replacement = """  // BPO War Room (working, real files)
  {sector:'BPO',name:'BPO War Room',url:'/html/war-rooms/bpo-war/bpo-war-room.html',tier:'war',dot:'#ef4444'},
  {sector:'BPO',name:'BPO Strategist',url:'/html/war-rooms/bpo-war/bpo-strategist.html',tier:'strat',dot:'#a78bfa'},
  {sector:'BPO',name:'BPO Exec Portal',url:'/html/war-rooms/bpo-war/bpo-executive-portal.html',tier:'exec',dot:'#c9a84c'},"""

result = re.sub(pattern, replacement, c, flags=re.DOTALL)

if result != c:
    with open(path, "w", encoding="utf-8") as f:
        f.write(result)
    print(f"✓ Patched {path} (11 tiles → 3 tiles)")
else:
    print(f"⚠ Pattern not found")
