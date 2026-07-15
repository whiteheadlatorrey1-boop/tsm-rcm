

window.TSM_PHASE0 = {

createMission(payload){

const mission = {

id:
"TSM-DEMO-"+Date.now(),

industry:
payload.industry || "general",

document:
payload.document || "uploaded-document",

status:
"QUEUED",

created:
new Date().toISOString()

};


window.dispatchEvent(

new CustomEvent(
"MISSION_CREATED",
{
detail:mission
})

);


return mission;

}

};

