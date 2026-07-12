// TSM Scenario Manager

const scenarios = [];

const __tsmExport = {

create(data = {}) {

const scenario = {
id: "SCN-" + Date.now(),
...data
};

scenarios.push(scenario);

return scenario;

},

list(){

return scenarios;

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.scenarioManager = __tsmExport;
}
