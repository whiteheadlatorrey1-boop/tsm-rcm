(function(){


window.TSMDemoCockpit = {


launch(id){


fetch(
"data/enterprise-lab/simulation-scenarios.json"
)
.then(
r=>r.json()
)
.then(
data=>{


const scenario =
data.scenarios.find(
s=>s.id===id
);


if(!scenario){

console.error(
"Scenario not found"
);

return;

}


if(window.TSMWarRoomSimulation){

const result =
window.TSMWarRoomSimulation.run(
scenario
);


console.log(
"DEMO COMPLETE",
result
);

}


}

);


}


};


})();
