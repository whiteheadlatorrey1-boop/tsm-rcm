window.TSMSemanticLayer={

 definitions:{},

 define(name,value){

  this.definitions[name]=value;

 },

 resolve(name){

  return this.definitions[name];

 }

};