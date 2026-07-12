const fs = require("fs");
const path = require("path");

console.log("\nTSM Enterprise Graph Intelligence Layer Installation\n");

const base = "html/shared/runtime/graph";

const files = {

"entity-graph.js":`
window.TSMEntityGraph = {

entities:{},

register(entity){

this.entities[entity.id]=entity;

return entity;

},

get(id){

return this.entities[id];

},

all(){

return Object.values(this.entities);

}

};
`,

"relationship-engine.js":`
window.TSMRelationshipEngine = {

relationships:[],

connect(source,target,type){

this.relationships.push({
source,
target,
type,
timestamp:new Date().toISOString()
});

},

find(entity){

return this.relationships.filter(
r=>r.source===entity || r.target===entity
);

}

};
`,

"dependency-map.js":`
window.TSMDependencyMap = {

dependencies:{},

register(source,target){

if(!this.dependencies[source]){
this.dependencies[source]=[];
}

this.dependencies[source].push(target);

},

getImpact(source){

return this.dependencies[source] || [];

}

};
`,

"impact-analysis.js":`
window.TSMImpactAnalysis = {

analyze(entity){

return {

entity,

impact:
window.TSMDependencyMap
?
window.TSMDependencyMap.getImpact(entity)
:
[],

timestamp:new Date().toISOString()

};

}

};
`,

"graph-query.js":`
window.TSMGraphQuery = {

find(criteria){

if(!window.TSMEntityGraph){
return [];
}

return window.TSMEntityGraph.all()
.filter(entity=>{

return Object.keys(criteria)
.every(key=>entity[key]===criteria[key]);

});

}

};
`,

"graph-memory.js":`
window.TSMGraphMemory = {

store:[],

remember(data){

this.store.push({
data,
timestamp:new Date().toISOString()
});

},

recall(){

return this.store;

}

};
`

};


if(!fs.existsSync(base)){
fs.mkdirSync(base,{recursive:true});
}


for(const [file,content] of Object.entries(files)){

const target=path.join(base,file);

fs.writeFileSync(target,content.trim()+"\n");

console.log("✓ "+target);

}


console.log("\nEnterprise Graph Intelligence Layer Complete\n");
