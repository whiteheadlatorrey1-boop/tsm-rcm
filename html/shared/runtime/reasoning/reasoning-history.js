// TSM Reasoning History

const history = [];

const __tsmImpl = {

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
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMReasoningReasoningHistory = __tsmImpl; }
