// TSM Conversation Memory

const memory = [];

const __tsmExport = {

store(message){

memory.push({
message,
timestamp:new Date().toISOString()
});

},

history(){

return memory;

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.conversationMemory = __tsmExport;
}
