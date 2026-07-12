// TSM Conversation Memory

const memory = [];

const __tsmImpl = {

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
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMAssistantConversationMemory = __tsmImpl; }
