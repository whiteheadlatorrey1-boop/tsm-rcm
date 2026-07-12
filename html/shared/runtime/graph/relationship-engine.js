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
