/**
 * Enterprise Environment Manager
 */

const environments=[];

const __tsmImpl = {

register(environment){

 environments.push(environment);

 return environment;

},

list(){

 return environments;

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMOperationsEnvironmentManager = __tsmImpl; }
