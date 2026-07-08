
const fs=require("fs");
const path=require("path");

const riskEngine=require("./mdm-risk-engine");


function buildHealth(summary){

return {
 ok:true,
 score:summary.overallScore,
 status:
 summary.overallScore >=80
 ? "HEALTHY"
 : "ATTENTION"
};

}



function buildAnomalies(detail){

return detail.records
.filter(
r=>r.quality < 80 ||
r.status==="DUPLICATE"
)
.map(r=>{

return {
...riskEngine.calculateRisk(r),
record:r
};

});

}



function buildMissions(anomalies){

return anomalies.map((a,i)=>({

id:
"MDM-"+Date.now()+"-"+i,

source_node:"mdm",

objective:
a.recommendedAction,

context:{
record:a.id
},

risk_score:a.score,

owner:
"Data Steward",

status:"OPEN",

completion_pct:0,

progression_steps:[

"Review anomaly",

"Approve remediation",

"Execute correction"

]

}));

}


module.exports={
buildHealth,
buildAnomalies,
buildMissions
};

