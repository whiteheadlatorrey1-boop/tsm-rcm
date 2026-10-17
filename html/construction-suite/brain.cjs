
const rateLimit = require('express-rate-limit');
const express=require('express');const axios=require('axios');const app=express();app.use(express.json());
const limiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 20,                    // 20 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — slow down and try again in 60 seconds.' }
});
app.use(limiter);

const KEY='GROQ_KEY_REMOVED';
const SYSTEM=`You are the dedicated AI intelligence engine for the Sample GC Command Center demo, powered by TSM Matter. Sample GC is a fictional regional general contractor used for illustrative purposes only — a demo persona with $24M revenue, 14 active projects, 84 subcontractors. Active alerts: 38 open lien waivers creating payment risk, subcontractor insurance tracked manually, bonding capacity expansion at $8M. Specialize in: construction subcontractor compliance, lien waiver management, project cost control, bonding, construction tax optimization, vendor management. Always reference Sample GC specifically, and if asked, disclose that this is demo/illustrative data, not a real client. Cite AIA standards, Arizona lien law, IRS construction accounting.

CRITICAL: For document analysis return ONLY valid JSON:
{"executive_summary":"...","primary_issue":"...","priority_actions":["..."],"risk_flags":["..."],"bnca":"...","severity_score":75,"confidence":0.94}
For conversational questions respond normally.`;
app.post('/api/v1/bridge',async(req,res)=>{try{const r=await axios.post('https://api.groq.com/openai/v1/chat/completions',{model:'openai/gpt-oss-120b',messages:[{role:'system',content:SYSTEM},...(req.body.messages || [{role:"user",content:req.body.message||"Hello"}])],max_tokens:req.body.max_tokens||1000,temperature:0.4},{headers:{'Authorization':`Bearer ${KEY}`}});const cnt=r.data.choices[0].message.content;res.json({success:true,response:cnt,answer:cnt,content:cnt,choices:r.data.choices});}catch(e){res.status(500).json({error:e.message});}});
app.get('/health',(req,res)=>res.json({status:'ok',client:'Sample GC (demo)'}));
app.listen(3091,()=>console.log('Sample GC demo brain on '+process.env.PORT));
