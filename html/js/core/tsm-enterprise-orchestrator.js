(function(){

window.TSM_ENTERPRISE={

async enrich(parsed){

const payload=

TSM_CONTRACTS.create(parsed);

const phases=

TSM_PHASE_ROUTER.route(
payload.vertical
);

const output={};

for(const phase of phases){

const result=

await TSM_PHASE_ENGINE.run(
phase,
payload
);

output[phase]={

result,

score:

TSM_PHASE_SCORING.score(result)

};

}

return{

timestamp:
new Date().toISOString(),

vertical:
payload.vertical,

missionId:
payload.missionId,

phases,

enterprise:
output

};

}

};

})();
