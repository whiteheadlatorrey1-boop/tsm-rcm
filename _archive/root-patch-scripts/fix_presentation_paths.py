path = "html/demo/presentation-hub.html"
with open(path, encoding="utf-8") as f:
    c = f.read()

old = "const PRES = 'html/demo/presentations';"
new = "const PRES = '/demo/presentations';"

if old in c:
    c = c.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)
    print(f"✓ Fixed PRES path for local server")
else:
    print(f"⚠ Pattern not found")
