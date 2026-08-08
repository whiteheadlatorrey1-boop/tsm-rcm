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