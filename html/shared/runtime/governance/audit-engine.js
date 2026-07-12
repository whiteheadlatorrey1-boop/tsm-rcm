window.TSMAuditEngine = {

record(event){

console.log("AUDIT EVENT",event);

return {
timestamp:new Date().toISOString(),
event
};

}

};