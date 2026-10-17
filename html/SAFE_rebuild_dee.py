from pathlib import Path

html = """<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Dee Command Center</title>
<style>
body{background:#050b14;color:#fff;font-family:Arial;padding:20px}
button{padding:10px;margin:5px;background:#0a1822;color:#fff;border:1px solid #00ffa3;cursor:pointer}
#out{margin-top:20px;border:1px solid #00ffa3;padding:15px}
</style>
</head>
<body>

<h2>Dee Command Center (Stable)</h2>

<button onclick="run('recovery')">Recovery</button>
<button onclick="run('payer')">Payer</button>
<button onclick="run('brief')">Brief</button>

<div id="out">Loading...</div>

<script>
async function run(mode){
  document.getElementById('out').innerHTML = "Running " + mode + "...";

  let prompt = "Run denial recovery";
  if(mode === "payer") prompt = "Escalate payer issues";
  if(mode === "brief") prompt = "Generate executive brief";

  try{
    const res = await fetch('/api/strategist/hc/dee-action',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({system:'Sample Health System',prompt})
    });

    const data = await res.json();

    document.getElementById('out').innerHTML =
      "<pre>"+JSON.stringify(data,null,2)+"</pre>";

  }catch(e){
    document.getElementById('out').innerHTML = "Error: "+e.message;
  }
}

run('recovery');
</script>

</body>
</html>
"""

Path("/workspaces/tsm-shell/html/honor-portal/index.html").write_text(html)

print("CLEAN FILE WRITTEN")
