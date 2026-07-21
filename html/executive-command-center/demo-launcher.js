
(async function(){


const response =
await fetch(
"demo-scenarios.json"
);


const data =
await response.json();



const container =
document.getElementById(
"scenarios"
);



data.scenarios.forEach(
scenario=>{


let card =
document.createElement(
"div"
);


card.className="card";


card.innerHTML=

`

<h2>${scenario.name}</h2>

<p>
Vertical:
${scenario.vertical}
</p>

<p>
SAP Phase:
${scenario.sapPhase}
</p>

<button>
Launch Mission
</button>

`;



card.querySelector(
"button"
)
.onclick=()=>{


let result =
TSMExecutiveDemoController.launchScenario(
scenario
);


console.log(
"DEMO RESULT",
result
);


alert(
"TSM Mission Launched: "
+
scenario.id
);


};



container.appendChild(card);


}

);


})();
