window.TSMMasterIndex={

 entities:{},

 register(id,data){

  this.entities[id]=data;

 },

 lookup(id){

  return this.entities[id];

 },

 list(){

  return Object.keys(this.entities);

 }

};