// TSM Reasoning History

const history = [];

const __tsmExport = {

store(reasoning){

history.push({

...reasoning,

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
  window.TSM.reasoningHistory = __tsmExport;
}
