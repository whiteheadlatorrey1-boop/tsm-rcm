/**
 * Integration Catalog
 */

const integrations=[];

module.exports={

register(adapter){

 integrations.push(adapter);

 return integrations;

},

list(){

 return integrations;

}

};
