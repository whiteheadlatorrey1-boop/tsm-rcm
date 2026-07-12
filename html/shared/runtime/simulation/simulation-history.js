// TSM Simulation History

const history = [];

const __tsmImpl = {

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
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMSimulationSimulationHistory = __tsmImpl; }
