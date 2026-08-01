path = "html/war-rooms/insure-war/insurance-strategist.html"
with open(path) as f:
    content = f.read()

old = '''    let txt='';
    try{
      const ctrl = new AbortController();
      const timeoutId = setTimeout(()=>ctrl.abort(), 20000);'''

new = '''    let txt='';
    try{
      // TEST TOGGLE — remove after verifying Node 4 fallback behavior.
      // Visit the page with ?forceN4Fail in the URL to force only Node 4
      // to fail, so Nodes 1-3 run live and you can confirm the fallback
      // confidence number matches Node 3's real BNCA score.
      if(i===4 && new URLSearchParams(location.search).has('forceN4Fail')){
        throw new Error('[test] forced Node 4 failure via ?forceN4Fail');
      }
      const ctrl = new AbortController();
      const timeoutId = setTimeout(()=>ctrl.abort(), 20000);'''

assert old in content, "target block not found — file may have changed"
assert content.count(old) == 1, "target block not unique"
content = content.replace(old, new)

with open(path, "w") as f:
    f.write(content)

print("Added ?forceN4Fail test toggle.")
