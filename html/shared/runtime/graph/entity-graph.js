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
