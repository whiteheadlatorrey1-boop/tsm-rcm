with open('server.js') as f:
    content = f.read()

old = """suites.forEach(s => {
  if (!s.route || !s.index) return;
  app.get(s.route, (req, res) => res.sendFile(path.join(dirPath, s.index)));
  app.get(s.route + '/', (req, res) => res.sendFile(path.join(dirPath, s.index)));
});"""

new = """suites.forEach(s => {
  if (!s.route || !s.index) return;
  const suiteDir = path.join(__dirname, s.dir);
  app.get(s.route, (req, res) => res.sendFile(path.join(suiteDir, s.index)));
  app.get(s.route + '/', (req, res) => res.sendFile(path.join(suiteDir, s.index)));
});"""

if new in content:
    print("already patched")
elif old in content:
    content = content.replace(old, new, 1)
    with open('server.js', 'w') as f:
        f.write(content)
    print("patched successfully")
else:
    print("still not found — something else is different, let's dig further")
