path = "html/demo/presentations/assets/engine.js"
with open(path, encoding="utf-8") as f:
    c = f.read()

# Change the IMG_ROOT path from tests/e2e/demo/screenshots to /demo-screenshots
old = "const IMG_ROOT = D.imgRoot || ('/demo-screenshots/' + D.folder + '/');"
new = "const IMG_ROOT = D.imgRoot || ('/demo-screenshots/' + D.folder + '/');"

# Actually, let's check what's in the file first
if "IMG_ROOT" in c:
    # Replace the path that points to tests/ with /demo-screenshots/
    c = c.replace("tests/e2e/demo/screenshots/", "/demo-screenshots/")
    c = c.replace("const IMG_ROOT = D.imgRoot || ('/demo-screenshots/' + D.folder + '/');", 
                  "const IMG_ROOT = '/demo-screenshots/' + D.folder + '/';")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)
    print(f"✓ Fixed engine IMG_ROOT path")
else:
    print(f"⚠ IMG_ROOT not found")
