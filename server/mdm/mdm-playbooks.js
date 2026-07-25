function execute(action){

return {

 success:true,

 action:action.action || "review",

 status:"QUEUED",

 timestamp:new Date().toISOString()

};

}


module.exports={
 execute
};