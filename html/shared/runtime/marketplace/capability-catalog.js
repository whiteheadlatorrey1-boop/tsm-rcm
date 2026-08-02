/**
 * Enterprise Capability Catalog
 */

const capabilities=[];

module.exports={

register(capability){

 capabilities.push(capability);

 return capabilities;

},

list(){

 return capabilities;

}

};
