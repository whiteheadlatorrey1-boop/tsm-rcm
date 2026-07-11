window.TSMActionExecutor = {

execute(action){

console.log(
"Executing action",
action
);

return {

action,

status:"EXECUTED",

timestamp:new Date().toISOString()

};

}

};
