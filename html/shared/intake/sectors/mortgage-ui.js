
(function(){

window.TSMMortgageUI = {

render:function(){

const sector =
window.TSM_ACTIVE_SECTOR;

if(!sector || sector.id!=="mortgage"){
return;
}


let container =
document.getElementById(
"mortgage-rescue-panel"
);


if(!container){

container=document.createElement("div");

container.id="mortgage-rescue-panel";

container.className="panel";

document.body.appendChild(container);

}


container.innerHTML=`

<h3>
🏠 TSM Mortgage Rescue Pack
</h3>

<div class="mortgage-pack-grid">

${sector.rescuePacks.map(
p=>`

<button 
class="mortgage-pack"
data-pack="${p}">
${p.replaceAll("-"," ").toUpperCase()}
</button>

`
).join("")}

</div>

`;



document.querySelectorAll(
".mortgage-pack"
)
.forEach(btn=>{

btn.onclick=function(){

window.TSM_SELECTED_MORTGAGE_PACK =
this.dataset.pack;


console.log(
"Mortgage Rescue Pack Selected:",
this.dataset.pack
);


};

});


}

};


window.addEventListener(
"load",
()=>{

setTimeout(()=>{

TSMMortgageUI.render();

},500);

});


})();

