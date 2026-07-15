#!/bin/bash
set -e

echo "=============================================="
echo " MORTGAGE API BUILDER"
echo "=============================================="


mkdir -p server/mortgage


cat > server/mortgage/mortgage-router.js <<'EOF'

const express=require("express");
const router=express.Router();

const engine=require("./mortgage-engine");


let missions=[];


router.get("/health",(req,res)=>{
res.json({
status:"healthy",
vertical:"mortgage"
});
});


router.get("/loans",(req,res)=>{
res.json(missions);
});


router.post("/missions",(req,res)=>{

const mission=
engine.createMission(req.body);

missions.push(mission);

res.json(mission);

});


router.get("/pipeline",(req,res)=>{

res.json({

activeLoans:missions.length,

pipelineValue:
missions.length*425000,

avgCycleTime:"18 days"

});

});


module.exports=router;

EOF


echo "Mortgage API created"