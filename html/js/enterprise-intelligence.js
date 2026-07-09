// TSM Enterprise Intelligence Client

window.TSMEnterprise = {

async request(endpoint,payload={}){

    const response = await fetch(
        `/api/enterprise/${endpoint}`,
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify(payload)
        }
    );

    return await response.json();

},


loadDashboard(context){
    return this.request("dashboard",context);
},


loadDecision(context){
    return this.request("decision",context);
},


loadMissions(context){
    return this.request("missions",context);
},


saveMissionQueue(missions){

    localStorage.setItem(
        "tsm_mission_queue",
        JSON.stringify(missions || [])
    );

},


getMissionQueue(){

    return JSON.parse(
        localStorage.getItem("tsm_mission_queue") || "[]"
    );

}

};
