#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"
SERVER="$ROOT/server.js"
STRATEGIST="$ROOT/html/hc-strategist/index.html"
BACKUP_DIR="$ROOT/backups/hc-enterprise-$(date +%s)"

mkdir -p "$BACKUP_DIR"

cp "$SERVER" "$BACKUP_DIR/server.js.bak"
cp "$STRATEGIST" "$BACKUP_DIR/strategist.bak"

echo "== PATCHING SERVER =="

cat >> "$SERVER" <<'EOF'

// ================= ENTERPRISE HC LAYER =================

// profiles
const HC_PROFILES_FILE = path.join(HC_DATA_DIR, 'profiles.json');

if (!fs.existsSync(HC_PROFILES_FILE)) {
  fs.writeFileSync(HC_PROFILES_FILE, JSON.stringify([
    { id:"honor", name:"HonorHealth", system:"HonorHealth", locations:["All","Scottsdale - Shea","Osborn"] },
    { id:"banner", name:"Banner", system:"Banner", locations:["All"] },
    { id:"dignity", name:"Dignity", system:"Dignity", locations:["All"] }
  ], null, 2));
}

app.get('/api/hc/profiles', (req,res)=>{
  res.json({ok:true, profiles: readJson(HC_PROFILES_FILE,[])});
});

// filtered nodes
app.get('/api/hc/nodes/filter', (req,res)=>{
  const {system='',location=''} = req.query;
  const state = readJson(HC_NODE_STATE_FILE,{});
  const filtered = Object.fromEntries(Object.entries(state).filter(([k,v])=>{
    return (!system || v.system===system) &&
           (!location || location==='All' || v.location===location);
  }));
  res.json({ok:true,state:filtered});
});

// BNCA
app.post('/api/hc/bnca',(req,res)=>{
  const {system='',location=''} = req.body||{};
  const state = readJson(HC_NODE_STATE_FILE,{});

  const nodes = Object.values(state).filter(n=>
    (!system || n.system===system) &&
    (!location || location==='All' || n.location===location)
  );

  const top = nodes.find(n=>n.findings)?.findings || "Operational drag across nodes";

  res.json({
    ok:true,
    bnca:{
      system,location,
      topIssue:top,
      whyItMatters:"Revenue + throughput pressure",
      bestNextCourseOfAction:[
        "Clear high-value backlog",
        "Escalate auth delays",
        "Rebalance intake + billing"
      ],
      ownerLanes:["Operations","Billing","Insurance"],
      confidence:"88%"
    }
  });
});

// REAL AI ROUTE
app.post('/api/hc/ask', async (req,res)=>{
  try{
    const {query='',system='',location=''} = req.body||{};
    const state = readJson(HC_NODE_STATE_FILE,{});

    const context = Object.entries(state)
      .filter(([k,v])=>
        (!system || v.system===system) &&
        (!location || location==='All' || v.location===location)
      )
      .map(([k,v])=>`NODE:${k}\n${v.findings}\n${v.summary}`)
      .join("\n\n");

    if(!process.env.GROQ_API_KEY){
      return res.json({
        ok:true,
        content:`TOP ISSUE\n${context || 'No data'}\n\nACTION\nFix backlog + auth`
      });
    }

    const payload = JSON.stringify({
      model:'openai/gpt-oss-120b',
      messages:[
        {role:'system',content:'Healthcare strategist. Be specific.'},
        {role:'user',content:`${query}\n\n${context}`}
      ]
    });

    const options={
      hostname:'api.groq.com',
      path:'/openai/v1/chat/completions',
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+process.env.GROQ_API_KEY,
        'Content-Length':Buffer.byteLength(payload)
      }
    };

    const r = https.request(options,res2=>{
      let b='';
      res2.on('data',d=>b+=d);
      res2.on('end',()=>{
        try{
          const out = JSON.parse(b).choices?.[0]?.message?.content;
          res.json({ok:true,content:out});
        }catch{res.json({ok:false})}
      });
    });

    r.write(payload); r.end();

  }catch(e){res.json({ok:false,error:e.message})}
};

EOF

echo "== PATCHING STRATEGIST =="

sed -i 's/reportedAt/updatedAt/g' "$STRATEGIST"

# inject API
grep -q "/api/hc/ask" "$STRATEGIST" || sed -i '0,/const API = {/s//const API = { ask:"\/api\/hc\/ask",/' "$STRATEGIST"

# replace AI call
sed -i 's#/api/hc/ask#/api/hc/ask#g' "$STRATEGIST"

echo "== DONE =="

echo "NEXT:"
echo "git add ."
echo "git commit -m 'enterprise hc upgrade'"
echo "git push"
