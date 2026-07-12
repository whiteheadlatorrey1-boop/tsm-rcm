// TSM Policy History

const history = [];

const __tsmExport = {

record(policy){

history.push({

...policy,

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
  window.TSM.policyHistory = __tsmExport;
}
