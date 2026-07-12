/**
 * Enterprise Environment Manager
 */

const environments=[];

module.exports={

register(environment){

 environments.push(environment);

 return environment;

},

list(){

 return environments;

}

};
