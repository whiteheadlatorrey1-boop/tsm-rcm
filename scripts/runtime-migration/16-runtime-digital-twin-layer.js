const fs = require("fs");
const path = require("path");

console.log(`
============================================================
TSM Runtime Digital Twin State Layer Installation
============================================================
`);

const ROOT = process.cwd();

const files = {

"html/shared/runtime/digital-twin/state-engine.js": `
window.TSMTwinState = {

state:{},

update(entity){

if(!entity || !entity.id) return;

this.state[entity.id] = {
...this.state[entity.id],
...entity,
updated:new Date().toISOString()
};

return this.state[entity.id];

},

get(id){

return this.state[id];

}

};
`,

"html/shared/runtime/digital-twin/entity-registry.js": `
window.TSMEntityRegistry = {

entities:{},

register(entity){

if(!entity.type || !entity.id) return;

this.entities[entity.id]=entity;

return entity;

},

get(id){

return this.entities[id];

}

};
`,

"html/shared/runtime/digital-twin/relationship-engine.js": `
window.TSMRelationshipEngine = {

links:[],

connect(source,target,type){

this.links.push({
source,
target,
type,
timestamp:new Date().toISOString()
});

},

find(entity){

return this.links.filter(
x=>x.source===entity || x.target===entity
);

}

};
`,

"html/shared/runtime/digital-twin/snapshot-store.js": `
window.TSMSnapshotStore = {

snapshots:[],

capture(state){

this.snapshots.push({

timestamp:new Date().toISOString(),

state

});

},

history(){

return this.snapshots;

}

};
`,

"html/shared/runtime/digital-twin/state-query.js": `
window.TSMTwinQuery = {

find(criteria){

return Object.values(
window.TSMTwinState.state
).filter(item=>{

return Object.entries(criteria)
.every(([k,v])=>item[k]===v);

});

}

};
`,

"html/shared/runtime/digital-twin/twin-health.js": `
window.TSMTwinHealth = {

calculate(){

const entities =
Object.keys(
window.TSMTwinState.state
).length;

return {

entities,

health:
entities ? 100 : 0,

timestamp:
new Date().toISOString()

};

}

};
`
};


const dir =
path.join(
ROOT,
"html/shared/runtime/digital-twin"
);

fs.mkdirSync(dir,{recursive:true});

console.log("✓ html/shared/runtime/digital-twin");


Object.entries(files).forEach(([file,data])=>{

const target = path.join(ROOT,file);

if(!fs.existsSync(target)){

fs.writeFileSync(
target,
data.trim()
);

}

console.log("✓",file);

});


console.log(`
Digital Twin State Layer Complete
`);
