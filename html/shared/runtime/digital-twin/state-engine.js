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