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