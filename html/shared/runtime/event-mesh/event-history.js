// TSM Event History

const history = [];

const __tsmImpl = {

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
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMEventMeshEventHistory = __tsmImpl; }
