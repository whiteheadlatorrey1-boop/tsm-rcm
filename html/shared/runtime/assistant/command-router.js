// TSM Command Router

const __tsmImpl = {

route(command){

return {

command,

destination:
"decision-runtime"

};

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMAssistantCommandRouter = __tsmImpl; }
