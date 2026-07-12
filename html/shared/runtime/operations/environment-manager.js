/**
 * Enterprise Environment Manager
 */

const environments=[];

const __tsmExport = {

register(environment){

 environments.push(environment);

 return environment;

},

list(){

 return environments;

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.environmentManager2 = __tsmExport;
}
