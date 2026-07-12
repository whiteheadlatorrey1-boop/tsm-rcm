// TSM Event History

const history = [];

const __tsmExport = {

store(event){

history.push({

...event,

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
  window.TSM.eventHistory = __tsmExport;
}
