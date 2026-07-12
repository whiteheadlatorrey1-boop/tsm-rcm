window.TSMWorkflowEngine = {

start(workflow){

return {

workflow,

status:"RUNNING",

started:new Date().toISOString()

};

},

complete(workflow){

return {

workflow,

status:"COMPLETED",

completed:new Date().toISOString()

};

}

};
