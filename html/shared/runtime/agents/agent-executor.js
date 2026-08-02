window.TSMAgentExecutor = {

execute(plan){

return {

status:"READY",

plan,

timestamp:new Date().toISOString()

};

}

};
