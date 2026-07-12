// TSM Simulation History

const history = [];

const __tsmExport = {

record(simulation){

history.push({

...simulation,

timestamp:new Date().toISOString()

});

},

list(){

return history;

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.simulationHistory = __tsmExport;
}
