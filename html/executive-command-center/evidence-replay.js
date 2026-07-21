(function(){


window.TSMReplayUI = {


load(){


fetch(
"../data/enterprise-lab/evidence-replay-log.json"
)
.then(
r=>r.json()
)
.then(
data=>{


const container =
document.getElementById(
"replay"
);


data.events.forEach(

event=>{


const div =
document.createElement(
"div"
);


div.innerHTML =

`
<h3>${event.id}</h3>
<p>
Mission:
${event.mission}
</p>

<p>
SAP Phase:
${event.sapPhase}
</p>

<p>
Decision:
${event.decision}
</p>

<p>
Reason:
${event.reason}
</p>

<hr>
`;


container.appendChild(div);


}

);


}

);


}


};


})();
